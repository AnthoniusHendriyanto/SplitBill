package postgres

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"

	gcvision "cloud.google.com/go/vision/apiv1"
	visionpb "google.golang.org/genproto/googleapis/cloud/vision/v1"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/user/split-mate/internal/domain"
)

var _ domain.OCRService = (*ocrService)(nil)

type ocrService struct {
	pool     *pgxpool.Pool
	apiKey   string
	gcvReady bool
}

func NewOCRService(pool *pgxpool.Pool) domain.OCRService {
	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		log.Println("Warning: GEMINI_API_KEY environment variable is empty. AI OCR live scans will be unavailable.")
	} else {
		log.Println("AI OCR initialized with valid Gemini API Key. Live scans activated!")
	}

	gcvReady := false
	creds := os.Getenv("GOOGLE_APPLICATION_CREDENTIALS")
	if creds != "" {
		if _, err := os.Stat(creds); err == nil {
			gcvReady = true
			log.Printf("Google Cloud Vision detected (credentials: %s)", creds)
		} else {
			log.Printf("GOOGLE_APPLICATION_CREDENTIALS set but file not found: %s", creds)
		}
	} else {
		log.Println("GOOGLE_APPLICATION_CREDENTIALS not set. Google Cloud Vision unavailable. Set it for better OCR accuracy.")
	}

	return &ocrService{
		pool:     pool,
		apiKey:   apiKey,
		gcvReady: gcvReady,
	}
}

func (m *ocrService) extractWithGCV(ctx context.Context, imageBytes []byte) (*domain.OCRResult, error) {
	if !m.gcvReady {
		return nil, fmt.Errorf("Google Cloud Vision is not configured")
	}

	client, err := gcvision.NewImageAnnotatorClient(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to create GCV client: %w", err)
	}
	defer client.Close()

	image := &visionpb.Image{Content: imageBytes}
	texts, err := client.DetectTexts(ctx, image, nil, 0)
	if err != nil {
		return nil, fmt.Errorf("GCV text detection failed: %w", err)
	}

	if len(texts) == 0 {
		return nil, fmt.Errorf("Google Cloud Vision could not detect any text in the image")
	}

	fullText := texts[0].Description
	log.Printf("[GCV] Raw text:\n%s", fullText)

	lines := strings.Split(fullText, "\n")
	priceRe := regexp.MustCompile(`(?:Rp\s*)?([\d,]+(?:\.\d{3})*(?:[,\.]\d{1,2})?)\s*$`)
	var items []domain.OCRItem

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		line = strings.TrimLeft(line, "•-–—*")
		line = strings.TrimPrefix(line, "Rp ")
		line = strings.TrimSpace(line)

		matches := priceRe.FindStringSubmatch(line)
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

		name := strings.TrimRight(strings.TrimSuffix(line, matches[0]), " ")
		name = strings.TrimSpace(name)
		if name == "" {
			name = "Item"
		}

		items = append(items, domain.OCRItem{
			Name:  name,
			Price: price,
		})
	}

	if len(items) == 0 {
		return nil, fmt.Errorf("GCV could not find any items with prices in the image")
	}

	log.Printf("[GCV SUCCESS] Parsed %d items via Google Cloud Vision!", len(items))
	return &domain.OCRResult{
		Title: "Receipt",
		Items: items,
	}, nil
}

// Request and Response structs for Gemini API
type GeminiPart struct {
	Text       string             `json:"text,omitempty"`
	InlineData *GeminiInlineData `json:"inlineData,omitempty"`
}

type GeminiInlineData struct {
	MimeType string `json:"mimeType"`
	Data     string `json:"data"`
}

type GeminiContent struct {
	Parts []GeminiPart `json:"parts"`
}

type GeminiRequest struct {
	Contents         []GeminiContent        `json:"contents"`
	GenerationConfig GeminiGenerationConfig `json:"generationConfig"`
}

type GeminiGenerationConfig struct {
	ResponseMimeType string `json:"responseMimeType"`
}

type GeminiResponse struct {
	Candidates []struct {
		Content struct {
			Parts []struct {
				Text string `json:"text"`
			} `json:"parts"`
		} `json:"content"`
	} `json:"candidates"`
}

func (m *ocrService) ExtractItems(ctx context.Context, imageBytes []byte) (*domain.OCRResult, error) {
	// Try Google Cloud Vision first (best accuracy, 1000 free units/month)
	if m.gcvReady {
		result, err := m.extractWithGCV(ctx, imageBytes)
		if err == nil {
			return result, nil
		}
		log.Printf("[OCR] GCV failed: %v. Trying Gemini API...", err)
	}

	// Fall back to Gemini API
	if m.apiKey == "" {
		if m.gcvReady {
			return nil, fmt.Errorf("both Google Cloud Vision and Gemini API failed. Please enter items manually")
		}
		log.Println("[OCR] No Gemini API key provided. Cannot process receipt.")
		return nil, fmt.Errorf("AI scanner is not configured. Please supply a valid GEMINI_API_KEY inside your .env file or enter receipt items manually")
	}

	log.Printf("[OCR] Starting live receipt scan via Gemini API...")

	// Encode image to base64
	base64Data := base64.StdEncoding.EncodeToString(imageBytes)

	// Detect MIME type dynamically or default to image/jpeg
	mimeType := "image/jpeg"
	if len(imageBytes) > 4 {
		if bytes.HasPrefix(imageBytes, []byte("\x89PNG\r\n\x1a\n")) {
			mimeType = "image/png"
		} else if bytes.HasPrefix(imageBytes, []byte("GIF87a")) || bytes.HasPrefix(imageBytes, []byte("GIF89a")) {
			mimeType = "image/gif"
		}
	}

	prompt := "You are a highly precise receipt extraction AI. Analyze the receipt image carefully. Your goal is to extract the exact menu items, restaurant name, and prices.\n\n" +
		"GUARDRAIL RULES:\n" +
		"1. If the uploaded image is NOT a receipt, invoice, restaurant bill, checkout ticket, or supermarket receipt, or if it is completely unreadable or blurry, you MUST respond with this exact JSON format:\n" +
		"   {\"error\": \"The uploaded image does not appear to be a clear or valid receipt. Please upload a clear photo of your receipt.\"}\n" +
		"2. Do NOT make up or hallucinate any items, prices, or names. If the restaurant name is not visible, use \"Receipt\".\n" +
		"3. Extract all individual menu items, their quantities, and their final prices as numbers.\n" +
		"4. Look for \"Service Charge\" or service percentage and \"Tax\" or PB1/government tax percentage.\n\n" +
		"SUCCESS FORMAT:\n" +
		"{\n" +
		"  \"title\": \"Restaurant Name\",\n" +
		"  \"items\": [\n" +
		"    {\n" +
		"      \"name\": \"Item Name\",\n" +
		"      \"price\": 125000\n" +
		"    }\n" +
		"  ],\n" +
		"  \"service_charge\": 10.0,\n" +
		"  \"tax\": 11.0\n" +
		"}\n\n" +
		"Respond with ONLY the raw JSON object. Do not include markdown code block syntax (like ```json), and do not add any explaining text."

	// Build Gemini request body
	reqBody := GeminiRequest{
		Contents: []GeminiContent{
			{
				Parts: []GeminiPart{
					{Text: prompt},
					{
						InlineData: &GeminiInlineData{
							MimeType: mimeType,
							Data:     base64Data,
						},
					},
				},
			},
		},
		GenerationConfig: GeminiGenerationConfig{
			ResponseMimeType: "application/json",
		},
	}

	jsonBytes, err := json.Marshal(reqBody)
	if err != nil {
		log.Printf("[OCR ERROR] Failed to marshal Gemini request payload: %v", err)
		return nil, fmt.Errorf("failed to prepare scanning payload: %w", err)
	}

	// Create HTTP request with client timeout
	client := &http.Client{Timeout: 30 * time.Second}
	apiURL := "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + m.apiKey

	req, err := http.NewRequestWithContext(ctx, "POST", apiURL, bytes.NewBuffer(jsonBytes))
	if err != nil {
		log.Printf("[OCR ERROR] Failed to create HTTP request: %v", err)
		return nil, fmt.Errorf("failed to create scanning request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		log.Printf("[OCR ERROR] Gemini API request failed: %v", err)
		return nil, fmt.Errorf("live scanning failed (request timeout or network error). Please try again or type manually")
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBodyBytes, _ := io.ReadAll(resp.Body)
		log.Printf("[OCR ERROR] Gemini returned non-OK status %d: %s", resp.StatusCode, string(respBodyBytes))
		return nil, fmt.Errorf("live scanning service returned error %d. Please try again or type manually", resp.StatusCode)
	}

	respBodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("[OCR ERROR] Failed to read Gemini response body: %v", err)
		return nil, fmt.Errorf("failed to parse receipt scan details: %w", err)
	}

	var geminiResp GeminiResponse
	if err := json.Unmarshal(respBodyBytes, &geminiResp); err != nil {
		log.Printf("[OCR ERROR] Failed to parse Gemini response: %v", err)
		return nil, fmt.Errorf("failed to decode receipt scan details: %w", err)
	}

	if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
		log.Printf("[OCR ERROR] Gemini returned empty candidates/parts.")
		return nil, fmt.Errorf("receipt scan returned empty results. Please ensure the receipt image is clear and readable")
	}

	rawText := geminiResp.Candidates[0].Content.Parts[0].Text
	log.Printf("[OCR] Received raw payload from Gemini: %s", rawText)

	// Clean up markdown block wrapping if present
	cleanText := strings.TrimSpace(rawText)
	cleanText = strings.TrimPrefix(cleanText, "```json")
	cleanText = strings.TrimPrefix(cleanText, "```")
	cleanText = strings.TrimSuffix(cleanText, "```")
	cleanText = strings.TrimSpace(cleanText)

	// Parse JSON into structured map including error guardrail field
	var parsedResult struct {
		Error         string `json:"error"`
		Title         string `json:"title"`
		Items         []struct {
			Name  string  `json:"name"`
			Price float64 `json:"price"`
		} `json:"items"`
		ServiceCharge float64 `json:"service_charge"`
		Tax           float64 `json:"tax"`
	}

	if err := json.Unmarshal([]byte(cleanText), &parsedResult); err != nil {
		log.Printf("[OCR ERROR] Failed to unmarshal extracted JSON payload: %v. Raw text: %s", err, cleanText)
		return nil, fmt.Errorf("failed to recognize the receipt text structure. Please type manually or check receipt clarity")
	}

	// Guardrail check: if AI flagged it as non-receipt or unreadable
	if parsedResult.Error != "" {
		log.Printf("[OCR GUARDRAIL] AI rejected the image: %s", parsedResult.Error)
		return nil, fmt.Errorf("%s", parsedResult.Error)
	}

	// Map to domain.OCRResult structure
	ocrItems := make([]domain.OCRItem, 0, len(parsedResult.Items))
	for _, item := range parsedResult.Items {
		ocrItems = append(ocrItems, domain.OCRItem{
			Name:  item.Name,
			Price: item.Price,
		})
	}

	finalResult := &domain.OCRResult{
		Title:         parsedResult.Title,
		Items:         ocrItems,
		ServiceCharge: parsedResult.ServiceCharge,
		Tax:           parsedResult.Tax,
	}

	log.Printf("[OCR SUCCESS] Successfully parsed %d items via live Gemini OCR!", len(ocrItems))

	// Save real verified receipt data to database (Guard against false info)
	if m.pool != nil && finalResult.Title != "" && strings.ToLower(finalResult.Title) != "receipt" {
		go func(title string, items []domain.OCRItem) {
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()

			cleanTitle := strings.TrimSpace(title)

			// 1. Get or insert venue
			var venueID string
			err := m.pool.QueryRow(ctx, "INSERT INTO venues (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id", cleanTitle).Scan(&venueID)
			if err != nil {
				log.Printf("[DB ERROR] Failed to record venue: %v", err)
				return
			}

			// 2. Insert menu items
			for _, item := range items {
				cleanItemName := strings.TrimSpace(item.Name)
				if cleanItemName == "" || item.Price <= 0 {
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
					venueID, cleanItemName, item.Price,
				)
				if err != nil {
					log.Printf("[DB ERROR] Failed to record menu item '%s': %v", cleanItemName, err)
				}
			}
			log.Printf("[DB SUCCESS] Crowd-sourced OCR intelligence saved: Recorded %d items for '%s'", len(items), cleanTitle)
		}(finalResult.Title, finalResult.Items)
	}

	return finalResult, nil
}