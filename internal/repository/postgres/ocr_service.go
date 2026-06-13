package postgres

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"image"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/user/split-mate/internal/domain"
)

var _ domain.OCRService = (*ocrService)(nil)

type ocrService struct {
	geminiKey   string
	groqKey     string
	paddleReady bool
	httpClient  *http.Client
	pythonPath  string
}

func NewOCRService(geminiKey, groqKey, pythonPath string) domain.OCRService {
	if geminiKey == "" {
		log.Println("Warning: GEMINI_API_KEY not set. Gemini fallback will be unavailable.")
	} else {
		log.Println("Gemini API key detected. Free tier structuring available.")
	}

	if groqKey == "" {
		log.Println("Warning: GROQ_API_KEY not set. Groq free tier unavailable.")
	} else {
		log.Println("Groq API key detected. Free tier available!")
	}

	paddleReady := false
	scriptPath := filepath.Join("internal", "repository", "postgres", "paddle_ocr.py")
	if _, err := os.Stat(scriptPath); err == nil {
		if exec.Command(pythonPath, "--version").Run() == nil {
			paddleReady = true
			log.Println("PaddleOCR script detected. Local OCR extraction available.")
		} else {
			log.Println("PaddleOCR requires Python 3. Install with: pip install paddlepaddle paddleocr")
		}
	}

	return &ocrService{
		geminiKey:   geminiKey,
		groqKey:     groqKey,
		paddleReady: paddleReady,
		httpClient:  &http.Client{Timeout: 30 * time.Second},
		pythonPath:  pythonPath,
	}
}

// ------- PaddleOCR: extracts raw text from image -------

type paddleLine struct {
	Text       string  `json:"text"`
	Confidence float64 `json:"confidence"`
	X          float64 `json:"x"`
	Y          float64 `json:"y"`
}

type paddleOutput struct {
	Success bool         `json:"success"`
	Error   string       `json:"error,omitempty"`
	Lines   []paddleLine `json:"lines,omitempty"`
}

type paddleResult struct {
	RawText string       // joined text for AI
	Lines   []paddleLine // per-line data
}

func (m *ocrService) extractTextWithPaddle(ctx context.Context, imageBytes []byte) (*paddleResult, error) {
	if !m.paddleReady {
		return nil, fmt.Errorf("PaddleOCR is not available")
	}

	tmpDir, err := os.MkdirTemp("", "splitmate-paddle-*")
	if err != nil {
		return nil, fmt.Errorf("failed to create temp dir: %w", err)
	}
	defer os.RemoveAll(tmpDir)

	tmpFile := filepath.Join(tmpDir, "receipt.png")
	if err := os.WriteFile(tmpFile, imageBytes, 0644); err != nil {
		return nil, fmt.Errorf("failed to write temp image: %w", err)
	}

	scriptPath := filepath.Join("internal", "repository", "postgres", "paddle_ocr.py")
	paddleCtx, paddleCancel := context.WithTimeout(ctx, 60*time.Second)
	defer paddleCancel()
	cmd := exec.CommandContext(paddleCtx, m.pythonPath, scriptPath, tmpFile)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return nil, fmt.Errorf("paddle script failed: %w, output: %s", err, string(output))
	}

	var result paddleOutput
	if err := json.Unmarshal(output, &result); err != nil {
		return nil, fmt.Errorf("failed to parse paddle output: %w, raw: %s", err, string(output))
	}

	if result.Error != "" {
		return nil, fmt.Errorf("paddle error: %s", result.Error)
	}

	if len(result.Lines) == 0 {
		return nil, fmt.Errorf("no text detected in image")
	}

	imgConfig, _, err := image.DecodeConfig(bytes.NewReader(imageBytes))
	if err == nil && imgConfig.Width > 0 && imgConfig.Height > 0 {
		for i := range result.Lines {
			result.Lines[i].X = (result.Lines[i].X / float64(imgConfig.Width)) * 100
			result.Lines[i].Y = (result.Lines[i].Y / float64(imgConfig.Height)) * 100
		}
	}

	texts := make([]string, len(result.Lines))
	for i, l := range result.Lines {
		texts[i] = l.Text
	}

	return &paddleResult{
		RawText: strings.Join(texts, "\n"),
		Lines:   result.Lines,
	}, nil
}

// ------- Shared receipt parsing logic (used by both AI providers) -------

type geminiStructuredResult struct {
	Error          string `json:"error"`
	RestaurantName string `json:"restaurant_name"`
	Date           string `json:"date"`
	Items          []struct {
		Name      string   `json:"name"`
		Quantity  int      `json:"quantity"`
		Modifiers []string `json:"modifiers"`
		Price     float64  `json:"price"`
	} `json:"items"`
	Subtotal      float64 `json:"subtotal"`
	ServiceCharge float64 `json:"service_charge"`
	Tax           float64 `json:"tax"`
	GrandTotal    float64 `json:"grand_total"`
	AiConfidence  float64 `json:"ai_confidence"`
}

const structurePrompt = `Extract receipt fields as JSON. Output ONLY the JSON object.

Receipts are primarily Indonesian cafe/restaurant receipts. May also be in English, Chinese, Japanese, Korean, or mixed.

INDONESIAN GUIDE:
- Tax: "PPN", "PB1", "Pajak", "PPh"
- Service: "Service Charge", "Service", "Servis", "Servis & Lainnya", "Svc Chg", "Svc", "Layanan"
- Total: "Total", "Grand Total", "Total Bayar", "Jumlah"
- Subtotal: "Subtotal", "Jumlah", "Sub Total"

PRICE PARSING:
- "Rp 25.000" -> 25000. Remove "Rp", dots (thousands separator), commas.
- "." is THOUSANDS separator in Indonesia (25.000 = 25000, NOT 25.0).
- "Rp 25.500" -> 25500 (NOT 25.5).
- "," is decimal separator (25,50 = 25.5) — rare.

QUANTITY PATTERNS:
- "2x Kopi Susu Rp 30.000" -> quantity=2, price=15000 each (30000 / 2)
- "Kopi Susu @15.000" -> quantity=1, price=15000
- Default quantity=1.

SCHEMA:
{
  "restaurant_name": "",
  "date": "YYYY-MM-DD",
  "items": [{"name": "", "quantity": 1, "modifiers": [], "price": 0.0}],
  "subtotal": 0.0,
  "service_charge": 0.0,
  "tax": 0.0,
  "grand_total": 0.0,
  "ai_confidence": 90.0
}

RULES:
- restaurant_name: from receipt top. "" if not visible.
- date: YYYY-MM-DD. "" if not visible. Use printed date, not today.
- items: only MAIN menu items with prices.
  - Sub-lines (toppings, add-ons, extras, level, size, temperature) are MODIFIERS. Attach their NAME to the parent item name with " + ".
  - CRITICAL: Modifier prices are FOR DISPLAY ONLY. NEVER add them to the parent item price. The parent uses its own listed price.
    Example: "Milk Tea Rp 36.000" and sub-line "Topping Rp 8.000" → price=36000, name="Milk Tea + Topping". Price stays 36000.
  - Drop zero-price sub-lines like "*Ice 0", "*Less Ice 0", "*Less sugar 0", "SUGAR LEVEL-30% Rp0", "Level 0" — these are order instructions, not modifiers. Do NOT attach.
  - If a price is unclear or missing -> 0. Do NOT guess any price.
  - ONLY use items that appear verbatim. NEVER invent items.
- subtotal: the printed subtotal. Authoritative.
  - If missing or unreliable (e.g., OCR merged it with another number), sum item prices as fallback subtotal.
- service_charge: Look for "Service Charge"/"Service"/"Servis"/"Servis & Lainnya"/"Svc"/"Layanan"/"Svc Chg". 0 if absent.
  - If percentage shown (e.g., "Service Charge 5%"), calculate: subtotal * percentage / 100.
  - CRITICAL: "Pajak"/"PPN"/"PB1" values NEVER go into service_charge. They are always tax.
- tax: Look for "PPN"/"PB1"/"Pajak"/"Tax"/"GST"/"VAT"/"PPh". 0 if absent.
  - If percentage shown (e.g., "PPN 11%"), calculate: subtotal * percentage / 100.
- grand_total: FINAL total. Look for "Total"/"Grand Total"/"Total Bayar"/"Jumlah". Authoritative.

MANDATORY COLUMN-MERGE CHECK:
  Indonesian receipts often have merged columns. ALWAYS verify: items_total + service_charge + tax == grand_total.
  If they DON'T match, the values were swapped by column merging. Swap service_charge and tax, then recheck.
  If "Pajak" has no adjacent number, the number between it and "Total" is the tax.

EXAMPLE (learn from this exact pattern):  
Input:
  "Nasi Ayam Etera 45.000
  Kopi Susu Gula Aren 38.000
  83.000
  Subtotal 4.650
  Servis & Lainnya 8.715
  Pajak
  96.365
  Total 96.365"
Output:
  items_total = 45000 + 38000 = 83000
  "Servis & Lainnya 8.715" -> candidate=8715 but this is actually tax (Pajak value)
  "Subtotal 4.650" -> 4650 too small for subtotal, its actually the service_charge
  "Pajak" -> no number, the value 8715 below it is the tax
  Cross-check: 83000 + 4650 + 8715 = 96365 == total -> CORRECT
  So: service_charge=4650, tax=8715

If NOT a receipt -> {"error": "Not a receipt."}

STRICT: Start with {. End with }. No other text, no markdown, no explanation.`

func (m *ocrService) parseStructuredJSON(rawJSON string) (*geminiStructuredResult, error) {
	rawJSON = strings.TrimSpace(rawJSON)
	rawJSON = strings.TrimPrefix(rawJSON, "```json")
	rawJSON = strings.TrimPrefix(rawJSON, "```")
	rawJSON = strings.TrimSuffix(rawJSON, "```")
	rawJSON = strings.TrimSpace(rawJSON)

	start := strings.Index(rawJSON, "{")
	end := strings.LastIndex(rawJSON, "}")
	if start >= 0 && end > start {
		rawJSON = rawJSON[start : end+1]
	}

	var parsed geminiStructuredResult
	if err := json.Unmarshal([]byte(rawJSON), &parsed); err != nil {
		return nil, fmt.Errorf("failed to parse structured JSON: %w, raw: %s", err, rawJSON)
	}
	if parsed.Error != "" {
		return nil, fmt.Errorf("%s", parsed.Error)
	}
	return &parsed, nil
}

func (m *ocrService) buildOCRResult(parsed *geminiStructuredResult) *domain.OCRResult {
	title := parsed.RestaurantName
	if title == "" {
		title = "Receipt"
	}

	date := parsed.Date
	if date == "" {
		date = time.Now().Format("2006-01-02")
	}

	items := make([]domain.OCRItem, 0, len(parsed.Items))
	for _, item := range parsed.Items {
		name := item.Name
		if len(item.Modifiers) > 0 {
			name += " + " + strings.Join(item.Modifiers, " + ")
		}
		if item.Quantity < 1 {
			item.Quantity = 1
		}
		items = append(items, domain.OCRItem{
			Name:     name,
			Price:    item.Price,
			Quantity: item.Quantity,
		})
	}

	var itemsTotal float64
	for _, item := range items {
		qty := item.Quantity
		if qty < 1 {
			qty = 1
		}
		itemsTotal += item.Price * float64(qty)
	}

	confidence := parsed.AiConfidence
	if confidence < 0 || confidence > 100 {
		confidence = 0
	}

	total := parsed.GrandTotal
	if total <= 0 {
		total = itemsTotal + parsed.ServiceCharge + parsed.Tax
	}

	return &domain.OCRResult{
		Title:         title,
		Date:          date,
		Items:         items,
		ServiceCharge: parsed.ServiceCharge,
		ServiceMode:   "amount",
		Tax:           parsed.Tax,
		TaxMode:       "amount",
		Total:         total,
		Confidence:    confidence,
	}
}

// ------- Groq (OpenAI-compatible API, free tier) -------

type chatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type chatChoice struct {
	Message chatMessage `json:"message"`
}

type chatResponse struct {
	Choices []chatChoice `json:"choices"`
}

func (m *ocrService) structureWithGroq(ctx context.Context, rawText string) (*domain.OCRResult, error) {
	if m.groqKey == "" {
		return nil, fmt.Errorf("Groq API key not configured")
	}

	userMsg := "Here is the raw OCR text from a receipt image:\n\n" + rawText

	reqBody := map[string]interface{}{
		"model": "llama-3.3-70b-versatile",
		"messages": []chatMessage{
			{Role: "system", Content: structurePrompt},
			{Role: "user", Content: userMsg},
		},
		"temperature":    0,
		"response_format": map[string]string{"type": "json_object"},
	}

	jsonBytes, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	client := m.httpClient
	req, err := http.NewRequestWithContext(ctx, "POST", "https://api.groq.com/openai/v1/chat/completions", bytes.NewBuffer(jsonBytes))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+m.groqKey)

	resp, err := client.Do(req)
	if err != nil {
		log.Printf("[OCR] Groq HTTP request failed: %v", err)
		return nil, fmt.Errorf("Groq API failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		log.Printf("[OCR] Groq API error: status=%d body=%s", resp.StatusCode, string(body))
		return nil, fmt.Errorf("Groq returned status %d: %s", resp.StatusCode, string(body))
	}

	var groqResp chatResponse
	if err := json.Unmarshal(body, &groqResp); err != nil {
		log.Printf("[OCR] Groq response parse error: %v, body=%s", err, string(body))
		return nil, fmt.Errorf("failed to parse Groq response: %w", err)
	}

	if len(groqResp.Choices) == 0 {
		log.Printf("[OCR] Groq returned empty choices, body=%s", string(body))
		return nil, fmt.Errorf("Groq returned empty response")
	}

	parsed, err := m.parseStructuredJSON(groqResp.Choices[0].Message.Content)
	if err != nil {
		log.Printf("[OCR] Groq structured JSON parse error: %v, raw=%s", err, groqResp.Choices[0].Message.Content)
		return nil, fmt.Errorf("Groq result parse error: %w", err)
	}

	return m.buildOCRResult(parsed), nil
}

// ------- Gemini Flash Free (Google AI free tier) -------

type geminiPart struct {
	Text string `json:"text,omitempty"`
}

type geminiContent struct {
	Parts []geminiPart `json:"parts"`
}

type geminiTextRequest struct {
	Contents         []geminiContent       `json:"contents"`
	GenerationConfig map[string]interface{} `json:"generationConfig"`
}

type geminiResponse struct {
	Candidates []struct {
		Content struct {
			Parts []struct {
				Text string `json:"text"`
			} `json:"parts"`
		} `json:"content"`
	} `json:"candidates"`
}

func (m *ocrService) structureWithGeminiFree(ctx context.Context, rawText string) (*domain.OCRResult, error) {
	if m.geminiKey == "" {
		return nil, fmt.Errorf("Gemini API key not configured")
	}

	userMsg := "Here is the raw OCR text from a receipt image:\n\n" + rawText

	reqBody := geminiTextRequest{
		Contents: []geminiContent{
			{Parts: []geminiPart{{Text: structurePrompt}}},
			{Parts: []geminiPart{{Text: userMsg}}},
		},
		GenerationConfig: map[string]interface{}{
			"responseMimeType": "application/json",
		},
	}

	jsonBytes, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	client := m.httpClient
	apiURL := "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + m.geminiKey

	req, err := http.NewRequestWithContext(ctx, "POST", apiURL, bytes.NewBuffer(jsonBytes))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("Gemini API failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Gemini returned status %d: %s", resp.StatusCode, string(body))
	}

	var geminiResp geminiResponse
	if err := json.Unmarshal(body, &geminiResp); err != nil {
		return nil, fmt.Errorf("failed to parse Gemini response: %w", err)
	}

	if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
		return nil, fmt.Errorf("Gemini returned empty response")
	}

	parsed, err := m.parseStructuredJSON(geminiResp.Candidates[0].Content.Parts[0].Text)
	if err != nil {
		return nil, fmt.Errorf("Gemini result parse error: %w", err)
	}

	return m.buildOCRResult(parsed), nil
}

// ------- Main entry point -------

func (m *ocrService) ExtractItems(ctx context.Context, imageBytes []byte) (*domain.OCRResult, error) {
	// Step 1: PaddleOCR extracts raw text from image
	paddleRes, err := m.extractTextWithPaddle(ctx, imageBytes)
	if err != nil {
		return nil, fmt.Errorf("PaddleOCR extraction failed: %w", err)
	}

	log.Printf("[OCR] Raw text extracted (%d chars)", len(paddleRes.RawText))

	log.Printf("[OCR] Raw text (%d chars):\n%s", len(paddleRes.RawText), paddleRes.RawText)

	// Step 2: Groq free tier (fast, 60 RPM, OpenAI-compatible)
	if m.groqKey != "" {
		result, err := m.structureWithGroq(ctx, paddleRes.RawText)
		if err == nil {
			log.Printf("[OCR SUCCESS] Structured %d items via PaddleOCR -> Groq (confidence=%.1f%%)", len(result.Items), result.Confidence)
			return result, nil
		}
		log.Printf("[OCR] Groq failed: %v. Trying Gemini free...", err)
	}

	// Step 3: Gemini Flash Free (Google free tier fallback)
	if m.geminiKey != "" {
		result, err := m.structureWithGeminiFree(ctx, paddleRes.RawText)
		if err == nil {
			log.Printf("[OCR SUCCESS] Structured %d items via PaddleOCR -> Gemini Free", len(result.Items))
			return result, nil
		}
		log.Printf("[OCR] Gemini Free failed: %v.", err)
	}

	return nil, fmt.Errorf("all AI structuring methods failed")
}
