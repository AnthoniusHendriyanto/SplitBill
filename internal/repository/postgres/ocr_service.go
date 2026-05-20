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
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/user/split-mate/internal/domain"
)

var _ domain.OCRService = (*ocrService)(nil)

type ocrService struct {
	pool            *pgxpool.Pool
	geminiKey       string
	openRouterKey   string
	paddleReady     bool
}

func NewOCRService(pool *pgxpool.Pool) domain.OCRService {
	geminiKey := os.Getenv("GEMINI_API_KEY")
	openRouterKey := os.Getenv("OPENROUTER_API_KEY")

	if geminiKey == "" {
		log.Println("Warning: GEMINI_API_KEY not set. Gemini structuring will be unavailable.")
	} else {
		log.Println("Gemini API key detected. Text structuring available!")
	}

	if openRouterKey == "" {
		log.Println("Warning: OPENROUTER_API_KEY not set. OpenRouter fallback will be unavailable.")
	} else {
		log.Println("OpenRouter API key detected. Fallback structuring available!")
	}

	paddleReady := false
	scriptPath := filepath.Join("internal", "repository", "postgres", "paddle_ocr.py")
	if _, err := os.Stat(scriptPath); err == nil {
		if exec.Command("python3", "--version").Run() == nil {
			paddleReady = true
			log.Println("PaddleOCR script detected. Local OCR extraction available.")
		} else {
			log.Println("PaddleOCR requires Python 3. Install with: pip install paddlepaddle paddleocr")
		}
	}

	return &ocrService{
		pool:          pool,
		geminiKey:     geminiKey,
		openRouterKey: openRouterKey,
		paddleReady:   paddleReady,
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
	RawText string        // joined text for Gemini
	Lines   []paddleLine  // per-line data for regex fallback
}

func (m *ocrService) extractTextWithPaddle(imageBytes []byte) (*paddleResult, error) {
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
	paddleCtx, paddleCancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer paddleCancel()
	cmd := exec.CommandContext(paddleCtx, "python3", scriptPath, tmpFile)
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

// ------- Gemini: structures raw text into receipt JSON -------

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

type geminiStructuredResult struct {
	Error         string `json:"error"`
	RestaurantName string `json:"restaurant_name"`
	Items         []struct {
		Name      string   `json:"name"`
		Quantity  int      `json:"quantity"`
		Modifiers []string `json:"modifiers"`
		Price     float64  `json:"price"`
	} `json:"items"`
	Subtotal      float64 `json:"subtotal"`
	ServiceCharge float64 `json:"service_charge"`
	Tax           float64 `json:"tax"`
	GrandTotal    float64 `json:"grand_total"`
}

const structurePrompt = `You are a precise receipt parser for Indonesian restaurant receipts.

INSTRUCTIONS:
1. Extract the restaurant name from the top of the receipt.
2. Extract address, date, and time if present.
3. Do NOT include address, phone number, cashier name, table number, date, or receipt metadata as menu items.
4. Menu items are located between the first separator after header info and the subtotal section.
5. A valid item usually has quantity on the left and price on the right.
6. Lines without prices under an item — like "Soy Milk" or "Oat Milk" — are modifiers/add-ons. Attach them to the previous item, do NOT create new items.
7. Tax labels may be "PB1", "PPN", "Tax", or "Pajak".
8. Service charge labels may be "Service Charge", "Service", or "Svc".
9. Do NOT make up or hallucinate any items, prices, or names.
10. If the text is not a receipt, respond with: {"error": "The provided text does not appear to be a receipt."}

EXPECTED JSON FORMAT:
{
  "restaurant_name": "",
  "address": "",
  "date": "",
  "time": "",
  "items": [
    {"name": "", "quantity": 1, "modifiers": [], "price": 0}
  ],
  "subtotal": 0,
  "service_charge": 0,
  "tax": 0,
  "grand_total": 0
}

Respond with ONLY the raw JSON object. No markdown, no explanation.`

func (m *ocrService) structureWithGemini(ctx context.Context, rawText string) (*domain.OCRResult, error) {
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

	client := &http.Client{Timeout: 15 * time.Second}
	apiURL := "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + m.geminiKey

	req, err := http.NewRequestWithContext(ctx, "POST", apiURL, bytes.NewBuffer(jsonBytes))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("Gemini text API failed: %w", err)
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

	rawJSON := strings.TrimSpace(geminiResp.Candidates[0].Content.Parts[0].Text)
	rawJSON = strings.TrimPrefix(rawJSON, "```json")
	rawJSON = strings.TrimPrefix(rawJSON, "```")
	rawJSON = strings.TrimSuffix(rawJSON, "```")
	rawJSON = strings.TrimSpace(rawJSON)

	var parsed geminiStructuredResult
	if err := json.Unmarshal([]byte(rawJSON), &parsed); err != nil {
		return nil, fmt.Errorf("failed to parse structured JSON: %w, raw: %s", err, rawJSON)
	}

	if parsed.Error != "" {
		return nil, fmt.Errorf("%s", parsed.Error)
	}

	title := parsed.RestaurantName
	if title == "" {
		title = "Receipt"
	}

	items := make([]domain.OCRItem, 0, len(parsed.Items))
	for _, item := range parsed.Items {
		name := item.Name
		if len(item.Modifiers) > 0 {
			name += " + " + strings.Join(item.Modifiers, " + ")
		}
		totalPrice := item.Price
		if item.Quantity > 1 {
			totalPrice = item.Price * float64(item.Quantity)
		}
		items = append(items, domain.OCRItem{
			Name:  name,
			Price: totalPrice,
		})
	}

	log.Printf("[GEMINI STRUCTURE] Parsed %d items from raw OCR text", len(items))
	return &domain.OCRResult{
		Title:         title,
		Items:         items,
		ServiceCharge: parsed.ServiceCharge,
		ServiceMode:   "amount",
		Tax:           parsed.Tax,
		TaxMode:       "amount",
	}, nil
}

// ------- OpenRouter: backup AI structuring (tries multiple models) -------

var openRouterModels = []string{
	"openrouter/owl-alpha",
	"z-ai/glm-5.1",
	"nvidia/nemotron-3-super-120b-a12b:free",
	"poolside/laguna-m.1:free",
	"openai/gpt-oss-120b:free",
	"qwen/qwen-2.5-7b-instruct:free",
}

type openRouterMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type openRouterChoice struct {
	Message openRouterMessage `json:"message"`
}

type openRouterResponse struct {
	Choices []openRouterChoice `json:"choices"`
}

func (m *ocrService) structureWithOpenRouter(ctx context.Context, rawText string) (*domain.OCRResult, error) {
	if m.openRouterKey == "" {
		return nil, fmt.Errorf("OpenRouter API key not configured")
	}

	userMsg := "Here is the raw OCR text from a receipt image:\n\n" + rawText
	lastErr := fmt.Errorf("no models tried")

	for _, model := range openRouterModels {
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		default:
		}

		reqBody := map[string]interface{}{
			"model": model,
			"messages": []openRouterMessage{
				{Role: "system", Content: structurePrompt},
				{Role: "user", Content: userMsg},
			},
		}

		jsonBytes, err := json.Marshal(reqBody)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal request: %w", err)
		}

		client := &http.Client{Timeout: 10 * time.Second}
		apiURL := "https://openrouter.ai/api/v1/chat/completions"

		req, err := http.NewRequestWithContext(ctx, "POST", apiURL, bytes.NewBuffer(jsonBytes))
		if err != nil {
			return nil, fmt.Errorf("failed to create request: %w", err)
		}
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+m.openRouterKey)
		req.Header.Set("HTTP-Referer", "https://splitmate.app")

		resp, err := client.Do(req)
		if err != nil {
			log.Printf("[OPENROUTER] Model %q failed (request): %v. Trying next...", model, err)
			lastErr = err
			continue
		}

		body, readErr := io.ReadAll(resp.Body)
		resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			log.Printf("[OPENROUTER] Model %q returned %d. Trying next...", model, resp.StatusCode)
			lastErr = fmt.Errorf("%s returned status %d", model, resp.StatusCode)
			continue
		}

		if readErr != nil {
			log.Printf("[OPENROUTER] Model %q read error: %v. Trying next...", model, readErr)
			lastErr = readErr
			continue
		}

		var orResp openRouterResponse
		if err := json.Unmarshal(body, &orResp); err != nil {
			log.Printf("[OPENROUTER] Model %q parse error: %v. Trying next...", model, err)
			lastErr = err
			continue
		}

		if len(orResp.Choices) == 0 {
			log.Printf("[OPENROUTER] Model %q returned empty choices. Trying next...", model)
			lastErr = fmt.Errorf("%s returned empty choices", model)
			continue
		}

		rawJSON := strings.TrimSpace(orResp.Choices[0].Message.Content)
		rawJSON = strings.TrimPrefix(rawJSON, "```json")
		rawJSON = strings.TrimPrefix(rawJSON, "```")
		rawJSON = strings.TrimSuffix(rawJSON, "```")
		rawJSON = strings.TrimSpace(rawJSON)

		var parsed geminiStructuredResult
		if err := json.Unmarshal([]byte(rawJSON), &parsed); err != nil {
			log.Printf("[OPENROUTER] Model %q JSON parse: %v. Trying next...", model, err)
			lastErr = err
			continue
		}

		if parsed.Error != "" {
			log.Printf("[OPENROUTER] Model %q returned error: %s. Trying next...", model, parsed.Error)
			lastErr = fmt.Errorf("%s: %s", model, parsed.Error)
			continue
		}

		title := parsed.RestaurantName
		if title == "" {
			title = "Receipt"
		}

		items := make([]domain.OCRItem, 0, len(parsed.Items))
		for _, item := range parsed.Items {
			name := item.Name
			if len(item.Modifiers) > 0 {
				name += " + " + strings.Join(item.Modifiers, " + ")
			}
			totalPrice := item.Price
			if item.Quantity > 1 {
				totalPrice = item.Price * float64(item.Quantity)
			}
			items = append(items, domain.OCRItem{
				Name:  name,
				Price: totalPrice,
			})
		}

		log.Printf("[OPENROUTER SUCCESS] Model %q parsed %d items", model, len(items))
		return &domain.OCRResult{
			Title:         title,
			Items:         items,
			ServiceCharge: parsed.ServiceCharge,
			ServiceMode:   "amount",
			Tax:           parsed.Tax,
			TaxMode:       "amount",
		}, nil
	}

	return nil, fmt.Errorf("all OpenRouter models failed: %w", lastErr)
}

// ------- Regex fallback: parses per-line Paddle data into items locally -------

// Lines matching any of these patterns are treated as receipt metadata, not items.
var metadataPatterns = []*regexp.Regexp{
	regexp.MustCompile(`(?i)^\s*(?:telp?|hp|phone|no\.?\s*(?:hp|telp?|phone|invoice|order|nota|faktur|bon|meja|table))`),
	regexp.MustCompile(`(?i)^\s*(?:kasir|cashier|cs|server|pramusaji|waiter|waitress)`),
	regexp.MustCompile(`(?i)^\s*(?:meja|table)\s*\d`),
	regexp.MustCompile(`(?i)^\s*(?:tanggal|date|tgl|waktu|time|jam)`),
	regexp.MustCompile(`(?i)^\s*(?:npwp|nik|alamat|address|jln?\.?|jalan)`),
	regexp.MustCompile(`(?i)^\s*(?:total|sub\s*total|grand\s*total|jumlah|pembayaran|kembali|change|service\s*charge|ppn|pb1|pajak|discount|diskon|bayar|tunai|cash|kartu|debit|kredit|qris|gopay|ovo)`),
	regexp.MustCompile(`(?i)^\s*(?:terima\s*kasih|thank\s*you|matur\s*nuwun|semoga\s*puas)`),
	regexp.MustCompile(`^\s*[-=*]{3,}\s*$`),
	regexp.MustCompile(`^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$`),
	regexp.MustCompile(`^\d{1,2}:\d{2}(?::\d{2})?\s*$`),
}

func (m *ocrService) extractWithRegex(lines []paddleLine) *domain.OCRResult {
	priceRe := regexp.MustCompile(`(?:Rp\s*)?([\d,]+(?:\.\d{3})*(?:[,\.]\d{1,2})?)\s*$`)
	var items []domain.OCRItem

	for _, pl := range lines {
		text := strings.TrimSpace(pl.Text)
		if text == "" {
			continue
		}

		isMeta := false
		for _, pat := range metadataPatterns {
			if pat.MatchString(text) {
				isMeta = true
				break
			}
		}
		if isMeta {
			continue
		}

		text = strings.TrimLeft(text, "•-–—*")
		text = strings.TrimPrefix(text, "Rp ")
		text = strings.TrimSpace(text)

		matches := priceRe.FindStringSubmatch(text)
		if len(matches) < 2 {
			continue
		}

		priceStr := matches[1]
		priceStr = strings.ReplaceAll(priceStr, ".", "")
		priceStr = strings.ReplaceAll(priceStr, ",", ".")
		price, err := strconv.ParseFloat(priceStr, 64)
		if err != nil || price <= 0 {
			continue
		}

		name := strings.TrimRight(strings.TrimSuffix(text, matches[0]), " ")
		name = strings.TrimSpace(name)
		if name == "" {
			name = "Item"
		}

		items = append(items, domain.OCRItem{
			Name:       name,
			Price:      price,
			Confidence: pl.Confidence,
			X:          pl.X,
			Y:          pl.Y,
		})
	}

	if len(items) == 0 {
		return nil
	}

	return &domain.OCRResult{
		Title:         "Receipt",
		Items:         items,
		ServiceMode:   "percent",
		TaxMode:       "percent",
	}
}

// ------- Main entry point -------

func (m *ocrService) ExtractItems(ctx context.Context, imageBytes []byte) (*domain.OCRResult, error) {
	// Step 1: PaddleOCR extracts raw text from image
	paddleRes, err := m.extractTextWithPaddle(imageBytes)
	if err != nil {
		return nil, fmt.Errorf("PaddleOCR extraction failed: %w", err)
	}

	log.Printf("[OCR] Raw text extracted (%d chars)", len(paddleRes.RawText))

	// Step 2: Gemini structures the raw text into receipt JSON
	if m.geminiKey != "" {
		result, err := m.structureWithGemini(ctx, paddleRes.RawText)
		if err == nil {
			log.Printf("[OCR SUCCESS] Structured %d items via PaddleOCR -> Gemini", len(result.Items))
			if m.pool != nil && result.Title != "" && strings.ToLower(result.Title) != "receipt" {
				go m.saveVenueData(result.Title, result.Items)
			}
			return result, nil
		}
		log.Printf("[OCR] Gemini failed: %v. Trying OpenRouter...", err)
	}

	// Step 3: OpenRouter as second AI fallback
	if m.openRouterKey != "" {
		result, err := m.structureWithOpenRouter(ctx, paddleRes.RawText)
		if err == nil {
			log.Printf("[OCR SUCCESS] Structured %d items via PaddleOCR -> OpenRouter", len(result.Items))
			if m.pool != nil && result.Title != "" && strings.ToLower(result.Title) != "receipt" {
				go m.saveVenueData(result.Title, result.Items)
			}
			return result, nil
		}
		log.Printf("[OCR] OpenRouter failed: %v. Falling back to regex...", err)
	}

	// Step 4: Regex fallback with metadata filtering and confidence
	result := m.extractWithRegex(paddleRes.Lines)
	if result != nil {
		log.Printf("[OCR] Parsed %d items via regex fallback", len(result.Items))
		return result, nil
	}

	return nil, fmt.Errorf("could not extract any items with prices from the image")
}

func (m *ocrService) saveVenueData(title string, items []domain.OCRItem) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cleanTitle := strings.TrimSpace(title)

	var venueID string
	err := m.pool.QueryRow(ctx, `INSERT INTO venues (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id`, cleanTitle).Scan(&venueID)
	if err != nil {
		log.Printf("[DB ERROR] Failed to record venue: %v", err)
		return
	}

	for _, item := range items {
		cleanName := strings.TrimSpace(item.Name)
		if cleanName == "" || item.Price <= 0 {
			continue
		}
		_, err = m.pool.Exec(ctx, `
			INSERT INTO venue_menu_items (venue_id, item_name, last_known_price, times_scanned, updated_at)
			VALUES ($1, $2, $3, 1, NOW())
			ON CONFLICT (venue_id, item_name)
			DO UPDATE SET 
				last_known_price = EXCLUDED.last_known_price,
				times_scanned = venue_menu_items.times_scanned + 1,
				updated_at = NOW()`,
			venueID, cleanName, item.Price,
		)
		if err != nil {
			log.Printf("[DB ERROR] Failed to record menu item '%s': %v", cleanName, err)
		}
	}
	log.Printf("[DB SUCCESS] Saved %d items for '%s'", len(items), cleanTitle)
}
