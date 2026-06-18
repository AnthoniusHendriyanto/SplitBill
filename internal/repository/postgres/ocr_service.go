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
- COMMA CONTEXT: In Indonesian OCR, a comma may actually be a misread dot (thousands separator). Check context: if a price like "32,000" would make sense as thirty-two thousand for the item (e.g., coffee), treat comma as thousands separator → 32000.
  CRITERIA for comma-as-thousands: if treating it as decimal gives < 100 and the item is clearly a menu item (not a cheap snack), prefer thousands interpretation.

QUANTITY PATTERNS:
- "2x Kopi Susu Rp 30.000" -> quantity=2, price=15000 each (30000 / 2)
- "Kopi Susu @15.000" -> quantity=1, price=15000
- Default quantity=1.

SCHEMA:
{
  "restaurant_name": "",
  "date": "YYYY-MM-DD",
  "items": [{"name": "", "quantity": 1, "modifiers": [], "price": 0.0}],  // modifiers ALWAYS empty [] — put modifier text in name field
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
  - Sub-lines (toppings, add-ons, extras, level, size, temperature, bean type, sweetness) are MODIFIERS. Attach them to the parent item name with " + " like "Americano Ice + arabica full". IMPORTANT: leave the "modifiers" array EMPTY [] — modifier names go in the "name" field only, not in "modifiers".
  - CRITICAL: Modifier prices are FOR DISPLAY ONLY. NEVER add them to the parent item price. The parent uses its own listed price.
    Example: "Milk Tea Rp 36.000" and sub-line "Topping Rp 8.000" → price=36000, name="Milk Tea + Topping". Price stays 36000.
    Example: "Americano (Ice) Rp 28.000" and sub-line "arabica full" → modifier "arabica full" is a bean type, no price. Name = "Americano (Ice) + arabica full", price stays 28000.
  - CRITICAL COLUMN-MERGE: If a modifier line has a PRICE on it (e.g., "arabica full Rp 48.000"), that price is NOT the modifier's price and NOT the parent's price. It's the NEXT ITEM's price that got column-merged onto the modifier line. The parent item's price comes from the PARENT'S OWN LINE ONLY (e.g., "Americano Icex1 Rp 28.000" → price=28000). Never change the parent's price based on a modifier line.
  - Drop zero-price sub-lines like "*Ice 0", "*Less Ice 0", "*Less sugar 0", "SUGAR LEVEL-30% Rp0", "Level 0" — these are order instructions, not modifiers. Do NOT attach.
  - If a price is unclear or missing -> 0. Do NOT guess any price.
  - ONLY use items that appear verbatim. NEVER invent items.
  - OCR artifacts: ")xN" means "xN" (e.g., "Ice)x1" → quantity 1). Treat ")x" as " x".
- subtotal: the printed subtotal. Authoritative.
  - If subtotal < items_total * 0.5 or subtotal > items_total * 2, the printed subtotal is likely an OCR error (merged/truncated). Fall back to sum of item prices.
  - If missing or unreliable (e.g., OCR merged it with another number), sum item prices as fallback subtotal.
- service_charge: Look for "Service Charge"/"Service"/"Servis"/"Servis & Lainnya"/"Svc"/"Layanan"/"Svc Chg". 0 if absent.
  - If percentage shown (e.g., "Service Charge 5%"), calculate: subtotal * percentage / 100.
  - CRITICAL: "Pajak"/"PPN"/"PB1" values NEVER go into service_charge. They are always tax.
- tax: Look for "PPN"/"PB1"/"Pajak"/"Tax"/"GST"/"VAT"/"PPh". 0 if absent.
  - If percentage shown (e.g., "PPN 11%"), calculate: subtotal * percentage / 100.
  - CRITICAL: If the Pajak/PPN line shows a number that equals grand_total, the line likely MERGED two values (Pajak + Total). The actual tax value is not this merged number.
- grand_total: FINAL total. Look for "Total"/"Grand Total"/"Total Bayar"/"Jumlah". Authoritative.

MANDATORY CROSS-CHECK (always perform in this order):
  Step 1: Compute items_total = sum of all item prices (quantity * price each).
  Step 2: If subtotal is reliable AND items_total != subtotal, then prices are likely SHIFTED by cascading column merge. Apply CASCADING COLUMN MERGE DETECTION (see below).
  Step 3: Verify: items_total + service_charge + tax == grand_total.
    - If NOT equal, service_charge and tax may be swapped. Swap and recheck.
  Step 4: TAX COMPUTATION FALLBACK (if tax is still unknown/unreliable after Step 3):
    If grand_total is reliable and items_total + service_charge <= grand_total, then:
      computed_tax = grand_total - items_total - service_charge
      If computed_tax > 0 and tax was 0 or suspect, USE computed_tax as the tax value.
  Step 5: SERVICE_CHARGE COMPUTATION FALLBACK (mirror of Step 4):
    If grand_total is reliable and items_total + tax <= grand_total, then:
      computed_service = grand_total - items_total - tax
      If computed_service > 0 and service_charge was 0 or suspect, USE computed_service.
  Example: items_total=32000, service_charge=0, grand_total=35200, tax=0
    → computed_tax = 35200 - 32000 - 0 = 3200
    → tax = 3200
  Example: items_total=83000, grand_total=96365, "Pajak" with no visible value
    → computed from difference if swap fails

CASCADING COLUMN MERGE DETECTION:
  Indonesian multi-column receipts cause a CASCADE where each item's price merges onto the NEXT item's line.
  This shifts ALL prices down by one position across consecutive items.
  Symptoms: items_total != subtotal, and multiple consecutive items have wrong prices.
  To detect: identify the segment where this occurs.
    - The FIRST affected item has NO price on its line — the price was prepended to the PREVIOUS row as column-merge noise.
    - The LAST affected item's price appears on the NEXT line (which becomes a dangling orphan price).
  FIX: Within the affected segment, shift each price UP by one position (assign each item the price of the line below it).
  Example:
    Input: "Item A Rp 1000\nItem B\nItem C Rp 3000\n2000"
    The cascading merge: Item A → has correct price 1000. Item B → no price (lost). Item C → has Item B's price 3000. "2000" → orphan (Item C's price).
    Corrected: Item A=1000, Item B=2000 (from orphan), Item C=3000 (shifted up from its own line). Total = 1000+2000+3000 = 6000.
  The KEY signal: items_total != subtotal. When detected, re-examine prices for a one-position shift across affected items.

MERGED-LINE DETECTION: Indonesian receipts often merge adjacent fields into one OCR line.
  - If "Pajak"/"PPN"/"PB1" is immediately followed by a number >= grand_total * 0.8, the tax keyword and total value merged. The actual tax value is NOT that number.
  - Apply TAX COMPUTATION FALLBACK (Step 3) in this case.
  - Similarly, if "Subtotal" is followed by a number < items_total * 0.5, the subtotal value may be truncated/merged. Fall back to items_total.

EXAMPLE 1 (column swap):
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

EXAMPLE 2 (merged Pajak+Total):
Input:
  "32,000
   1 Black Peach Coffee
   Subtotal 1 Produk 32,000
   Pajak 35,200
   Total"
Output:
  items_total = 32000 (one item)
  "Pajak 35,200" -> merged line, Pajak number = 35200 which equals grand_total -> REJECT as tax
  computed_tax = 35200 - 32000 - 0 = 3200
  So: tax=3200, service_charge=0, grand_total=35200

EXAMPLE 3 (cascading column merge):
Input:
  "Americano Icex1 Rp 28.000
   arabica full Rp 48.000
   Garang Asem Sa..x1
   tambah rawit potong dikuah Rp22.000
   Bakwan Jagung x1 Rp110.000
   Asem-Asem Dagingx2 Rp33.000
   Tumis Daun Pep..x1 Rp76.000
   Tahu Telur x2
   Nasi Putih x1 Rp8.000"
CASCADE PATTERN (price shifted down by 1 position):
  Line 1: "Americano Icex1 Rp 28.000" → Item A, price=28000 (OWN price, correct)
  Line 2: "arabica full Rp 48.000" → MODIFIER of Item A. Has a price on its line (48000).
          → BUT it's a MODIFIER — it has NO price. "Rp 48.000" = Item B's price.
          → Item A KEEPS its own price: 28000. Do NOT change it.
  Line 3: "Garang Asem Sa..x1" → Item B, no price on its line
          → Item B's price = 48000 (taken from Line 2's dangling price)
  Line 4: "tambah rawit potong dikuah Rp22.000" → MODIFIER of Item B
          → "Rp22.000" = Item C's price. Item B keeps 48000.
  Line 5: "Bakwan Jagung x1 Rp110.000" → Item C. Its own price is 22000 (from Line 4).
          → "Rp110.000" belongs to Item D. Item C price = 22000.
  Line 6: "Asem-Asem Dagingx2 Rp33.000" → Item D x2. Price on line (33000) belongs to Item E.
          → Item D unit price = 55000 (computed: 110000 total / 2). "Rp33.000" = Item E's price.
  Line 7: "Tumis Daun Pep..x1 Rp76.000" → Item E. Price on line (76000) belongs to Item F.
          → Item E price = 33000. "Rp76.000" = Item F's price.
  Line 8: "Tahu Telur x2" → Item F x2. No price on its line → cascade ended.
          → Item F unit price = 38000 (computed: 76000 total / 2).
  Line 9: "Nasi Putih x1 Rp8.000" → Item G, price=8000 (own price, cascade ended)
Output:
  Americano Ice x1: price=28000, "arabica full" as modifier
  Garang Asem Sa.. x1: price=48000, "tambah rawit potong dikuah" as modifier
  Bakwan Jagung x1: price=22000
  Asem-Asem Daging x2: price=55000 (each, not total)
  Tumis Daun Pep.. x1: price=33000
  Tahu Telur x2: price=38000 (each, not total)
  Nasi Putih x1: price=8000
  CRITICAL: "price" is ALWAYS unit price (price each), NOT total price. When qty>1, the line shows total price (e.g., "Rp44.000" for qty=2). COMPUTE unit_price = total / qty (e.g., 44000/2 = 22000). Output the RESULT, not the expression.

TAKE AWAY / DINE IN sections:
  Items after "TAKE AWAY" or "DINE IN" headers are still REGULAR ITEMS. Do NOT skip them.
  They are part of the same order, just labeled for packaging.

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
