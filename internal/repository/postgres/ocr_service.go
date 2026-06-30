package postgres

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"image"
	"image/color"
	"image/jpeg"
	_ "image/png"
	"io"
	"log"
	"math"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/user/split-mate/internal/domain"
)

var _ domain.OCRService = (*ocrService)(nil)

type ocrService struct {
	groqKey     string
	paddleReady bool
	httpClient  *http.Client
	pythonPath  string
}

func NewOCRService(groqKey, pythonPath string) domain.OCRService {
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

type ocrStructuredResult struct {
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
	Discount      float64 `json:"discount"`
	GrandTotal    float64 `json:"grand_total"`
	AiConfidence  float64 `json:"ai_confidence"`
}

const promptCore = `Extract receipt fields as JSON. Output ONLY the JSON object.

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
- CRITICAL: "753.086" = 753086 (seven hundred fifty-three thousand eighty-six), NOT 753086/100 = 7530.86. The dot is a thousands separator. This applies to ALL prices and totals.
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
  "items": [{"name": "", "quantity": 1, "modifiers": [], "price": 0.0}],
   "subtotal": 0.0,
   "service_charge": 0.0,
   "tax": 0.0,
   "grand_total": 0.0,
   "discount": 0.0,
   "ai_confidence": 90.0
}

RULES:
- restaurant_name: from receipt top. "" if not visible.
- date: YYYY-MM-DD. "" if not visible. Use printed date, not today.
- items: only MAIN menu items with prices.
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
- discount: sum of ALL discounts. 0 if none. Look for "Aeon card disc", "Item promo", "MM DISC", "Diskon", "Disc", "Promo", "-" prefix amounts.
- CRITICAL: discount MUST be a single number like 122916. NEVER output an expression like "850 + 14900". Compute the total first, then write the number.

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

MERGED-LINE DETECTION: Indonesian receipts often merge adjacent fields into one OCR line.
  - If "Pajak"/"PPN"/"PB1" is immediately followed by a number >= grand_total * 0.8, the tax keyword and total value merged. The actual tax value is NOT that number.
  - Apply TAX COMPUTATION FALLBACK (Step 3) in this case.
  - Similarly, if "Subtotal" is followed by a number < items_total * 0.5, the subtotal value may be truncated/merged. Fall back to items_total.

If NOT a receipt -> {"error": "Not a receipt."}

STRICT: Start with {. End with }. No other text, no markdown, no explanation.`

const visionPromptCore = `Extract receipt fields as JSON. Output ONLY the JSON object.

Receipts are primarily Indonesian cafe/restaurant receipts. May also be in English, Chinese, Japanese, Korean, or mixed.

You see the receipt image directly. Read the actual printed text and layout. Do NOT guess or hallucinate items or prices.

CRITICAL — QUANTITY: Read quantity from the IMAGE. Only set qty>1 when you SEE an explicit quantity marker ("×", "x", "@", "pcs") on the receipt.
- "4× Kopi Susu Rp 100.000" → SEE "4×" → quantity=4, unit_price=25000 (100000/4)
- "2 Bakmi Ayam 120,000" → SEE "2" then no Rp → qty=2, unit_price=60000
- "1 Choco Lava Toast 65,000" → SEE "1" then item name → qty=1, price=65000. NEVER divide 65000 by 2.
- "Kopi Susu @15.000" → SEE "@" → quantity=1 (no qty marker), unit_price=15000
- NO "×"/"x"/"@" visible on that line? Then quantity=1 and price is whatever's printed.
- CRITICAL RULE: NEVER divide a price just because it's round or divisible. Only set qty>1 when you literally see a multiplier in the image.
- price = UNIT PRICE (per single item). NEVER the line total.
- SELF-CHECK: quantity × unit_price must ≈ the total printed on that line. If not, re-read the image.

INDONESIAN GUIDE:
- Tax: "PPN", "PB1", "Pajak", "PPh"
- Service: "Service Charge", "Service", "Servis", "Servis & Lainnya", "Svc Chg", "Svc", "Layanan"
- Total: "Total", "Grand Total", "Total Bayar", "Jumlah"
- Subtotal: "Subtotal", "Jumlah", "Sub Total"

PRICE PARSING:
- "Rp 25.000" -> 25000. Remove "Rp", dots (thousands separator), commas.
- "." is THOUSANDS separator in Indonesia (25.000 = 25000, NOT 25.0).
- "Rp 25.500" -> 25500 (NOT 25.5).
- CRITICAL: "753.086" = 753086 (seven hundred fifty-three thousand eighty-six), NOT 7530.86. The dot is a thousands separator. This applies to ALL prices and totals.
- "," is decimal separator (25,50 = 25.5) — rare.
- COMMA CONTEXT: In Indonesian OCR, a comma may actually be a misread dot (thousands separator). Check context: if a price like "32,000" would make sense as thirty-two thousand for the item (e.g., coffee), treat comma as thousands separator → 32000.
  CRITERIA for comma-as-thousands: if treating it as decimal gives < 100 and the item is clearly a menu item (not a cheap snack), prefer thousands interpretation.

SCHEMA:
{
  "restaurant_name": "",
  "date": "YYYY-MM-DD",
  "items": [{"name": "", "quantity": 1, "modifiers": [], "price": 0.0}],
   "subtotal": 0.0,
   "service_charge": 0.0,
   "tax": 0.0,
   "grand_total": 0.0,
   "discount": 0.0,
   "ai_confidence": 90.0
}

RULES:
- restaurant_name: from receipt top. "" if not visible.
- date: YYYY-MM-DD. "" if not visible. Use printed date, not today.
- items: only MAIN menu items with prices. One item per row.
- If a price is unclear or missing -> 0. Do NOT guess any price.
- ONLY use items that appear verbatim. NEVER invent items.
- subtotal: the printed subtotal. Authoritative.
  - If subtotal is unreasonably low or high (less than half or more than double sum of item prices), fall back to sum of item prices.
- service_charge: Look for "Service Charge"/"Service"/"Servis"/"Servis & Lainnya"/"Svc"/"Layanan"/"Svc Chg". 0 if absent.
  - If percentage shown (e.g., "Service Charge 5%"), calculate: subtotal * percentage / 100.
  - CRITICAL: "Pajak"/"PPN"/"PB1" values NEVER go into service_charge. They are always tax.
- tax: Look for "PPN"/"PB1"/"Pajak"/"Tax"/"GST"/"VAT"/"PPh". 0 if absent.
  - If percentage shown (e.g., "PPN 11%"), calculate: subtotal * percentage / 100.
- grand_total: FINAL total. Look for "Total"/"Grand Total"/"Total Bayar"/"Jumlah". Authoritative.
- discount: sum of ALL discounts. 0 if none. Look for "Aeon card disc", "Item promo", "MM DISC", "Diskon", "Disc", "Promo", "-" prefix amounts, reward/cashback redemptions (gift card, point redemption).
  - CRITICAL: discount MUST be a single number like 122916. NEVER output an expression like "850 + 14900". Compute the total first, then write the number.

MANDATORY CROSS-CHECK (always perform):
  Step 1: Compute items_total = sum of all item prices (quantity * price each).
  Step 2: Verify: items_total + service_charge + tax == grand_total.
    - If NOT equal, service_charge and tax may be swapped. Swap and recheck.
  Step 3: TAX COMPUTATION FALLBACK (if tax is still unknown/unreliable after Step 2):
    If grand_total is reliable and items_total + service_charge <= grand_total, then:
      computed_tax = grand_total - items_total - service_charge
      If computed_tax > 0 and tax was 0 or suspect, USE computed_tax as the tax value.
  Step 4: SERVICE_CHARGE COMPUTATION FALLBACK (mirror of Step 3):
    If grand_total is reliable and items_total + tax <= grand_total, then:
      computed_service = grand_total - items_total - tax
      If computed_service > 0 and service_charge was 0 or suspect, USE computed_service.
  Example: items_total=32000, service_charge=0, grand_total=35200, tax=0
    → computed_tax = 35200 - 32000 - 0 = 3200
    → tax = 3200

If NOT a receipt -> {"error": "Not a receipt."}

STRICT: Start with {. End with }. No other text, no markdown, no explanation.`

const promptRestaurant = `
  - Sub-lines (toppings, add-ons, extras, level, size, temperature, bean type, sweetness) are MODIFIERS. Attach them to the parent item name with " + " like "Americano Ice + arabica full". IMPORTANT: leave the "modifiers" array EMPTY [] — modifier names go in the "name" field only, not in "modifiers".
  - CRITICAL: Modifier prices are FOR DISPLAY ONLY. NEVER add them to the parent item price. The parent uses its own listed price.
    Example: "Milk Tea Rp 36.000" and sub-line "Topping Rp 8.000" → price=36000, name="Milk Tea + Topping". Price stays 36000.
    Example: "Americano (Ice) Rp 28.000" and sub-line "arabica full" → modifier "arabica full" is a bean type, no price. Name = "Americano (Ice) + arabica full", price stays 28000.
  - CRITICAL COLUMN-MERGE: If a modifier line has a PRICE on it (e.g., "arabica full Rp 48.000"), that price is NOT the modifier's price and NOT the parent's price. It's the NEXT ITEM's price that got column-merged onto the modifier line. The parent item's price comes from the PARENT'S OWN LINE ONLY (e.g., "Americano Icex1 Rp 28.000" → price=28000). Never change the parent's price based on a modifier line.
  - Drop zero-price sub-lines like "*Ice 0", "*Less Ice 0", "*Less sugar 0", "SUGAR LEVEL-30% Rp0", "Level 0" — these are order instructions, not modifiers. Do NOT attach.

TAKE AWAY / DINE IN sections:
  Items after "TAKE AWAY" or "DINE IN" headers are still REGULAR ITEMS. Do NOT skip them.
  They are part of the same order, just labeled for packaging.`

const visionPromptRestaurant = `
  - CRITICAL — QUANTITY: Set qty>1 ONLY when you see a multiplier ("×", "x") on that specific receipt line.
  - "1 Choco Lava Toast 65,000" → qty=1, price=65000. DO NOT divide 65000 by 2. The "1" is the quantity.
  - "2 Mineral Water 30,000" → qty=2, unit_price=15000 (=30000/2). The "2" before item name = quantity.
  - "Fresh Milk 0" with no digit before the name → qty=1, price=0. No quantity shown = qty=1.
  - NEVER infer qty>1 from a round price. Divide ONLY when a quantity digit or "×" appears in the image.
  - Sub-lines (toppings, add-ons, extras, level, size, temperature, bean type, sweetness) are MODIFIERS. Attach them to the parent item name with " + " like "Americano Ice + arabica full". IMPORTANT: leave the "modifiers" array EMPTY [] — modifier names go in the "name" field only, not in "modifiers".
  - CRITICAL: Modifier prices are FOR DISPLAY ONLY. NEVER add them to the parent item price. The parent uses its own listed price.
    Example: "Milk Tea Rp 36.000" and sub-line "Topping Rp 8.000" → price=36000, name="Milk Tea + Topping". Price stays 36000.
    Example: "Americano (Ice) Rp 28.000" and sub-line "arabica full" → modifier "arabica full" is a bean type, no price. Name = "Americano (Ice) + arabica full", price stays 28000.
  - CRITICAL VISUAL READING: Indonesian receipts often use 2–3 columns. Read across columns correctly. Each item belongs to a SINGLE row. A price visually aligned to the right column belongs to the item on the same row, not the previous or next row.
  - If a modifier line has its OWN price (e.g., "Topping Rp 8.000" on a separate line below the parent), the price belongs to that modifier line as a SEPARATE ITEM, not the parent. Create a separate item entry for it.
  - Drop zero-price sub-lines like "*Ice 0", "*Less Ice 0", "*Less sugar 0", "SUGAR LEVEL-30% Rp0", "Level 0" — these are order instructions, not modifiers. Do NOT attach.
TAKE AWAY / DINE IN sections:
  Items after "TAKE AWAY" or "DINE IN" headers are still REGULAR ITEMS. Do NOT skip them.
  They are part of the same order, just labeled for packaging.`

const promptSupermarket = `SUPERMARKET RECEIPT: numbered items with discounts (AEON style).

For EVERY item: COMPUTE final price = base_price - discounts. Output the number, NOT the expression.
"discount" field = sum of ALL discounts. COMPUTE the total.

FIND ITEMS by 3-digit line numbers (004, 016, 021, etc.):
- "004 SHAFELLD ER ITA 19.800" → name="SHAFELLD ER ITA", price=19800
- "016 Aeon card disc SANGRAY OKRA CH -1.680" → name="SANGRAY OKRA CH"
  Next line "527,0000.102 53,754 -2.687" → base=53754, discounts 1680+2687=4367, final=49387
- "015 MM_DISC P000750089 ACUVIVA 700M -14,900" + next "2,800 12 33,600" → name="ACUVIVA 700M", unit_price=2800, qty=12
- "021 SANGRAY DRIED B" + calc line "555.0000.116 64,380" → base=64380

APPLY DISCOUNTS: "Aeon card disc -NNN" or "-NNN" at line end → subtract from preceding item
- Multiple discounts on same item? Sum them first, then subtract
- Discount named after a variant (like "ROASTED ALMOND") → append to item name: "SANGRAY FREEZE + ROASTED ALMOND"

COMPUTE these (output the result, never the expression):
Example: base=17000, disc 850 → price=16150
Example: base=29800, disc 14900 → price=14900
Example: base=74928, disc 3746 → price=71182
Example: base=41688, discs 3039+2084=5123 → price=36565
Example: discounts: 850+14900+4367+3746+5123+2952 → discount=31938

SKIP barcode-only lines, calculation lines (base×mult), standalone discounts with no line number.`

var numberedItemRe = regexp.MustCompile(`(?m)^\d{3}\s+[A-Z]{2,}`)

func isSupermarket(rawText string) bool {
	lower := strings.ToLower(rawText)

	if strings.Contains(lower, "aeon card disc") {
		return true
	}
	if strings.Contains(lower, "mm disc") {
		return true
	}

	// Multiple numbered inventory items (3-digit codes at line start) = supermarket
	if len(numberedItemRe.FindAllString(rawText, -1)) >= 3 {
		return true
	}

	// Restaurant-specific keywords override
	if strings.Contains(lower, "servis & lainnya") {
		return false
	}
	if strings.Contains(lower, "take away") {
		return false
	}
	if strings.Contains(lower, "dine in") {
		return false
	}

	return false
}

func buildPrompt(rawText string) string {
	if isSupermarket(rawText) {
		return promptCore + "\n\n" + promptSupermarket
	}
	return promptCore + "\n\n" + promptRestaurant
}

func buildVisionPrompt() string {
	return visionPromptCore + "\n\n" + visionPromptRestaurant
}

func evalExpr(s string) string {
	s = strings.TrimSpace(s)
	s = strings.ReplaceAll(s, ",", "")
	re := regexp.MustCompile(`[\d\s+\-*/().]+`)
	if !re.MatchString(s) {
		return s
	}
	re = regexp.MustCompile(`\s+`)
	s = re.ReplaceAllString(s, "")
	var r float64
	var op byte = '+'
	numStr := ""
	for i := 0; i <= len(s); i++ {
		if i < len(s) && (s[i] >= '0' && s[i] <= '9' || s[i] == '.') {
			numStr += string(s[i])
			continue
		}
		if numStr != "" {
			n, _ := strconv.ParseFloat(numStr, 64)
			switch op {
			case '+':
				r += n
			case '-':
				r -= n
			case '*':
				r *= n
			case '/':
				if n != 0 {
					r /= n
				}
			}
			numStr = ""
		}
		if i < len(s) && (s[i] == '+' || s[i] == '-' || s[i] == '*' || s[i] == '/') {
			op = s[i]
		}
	}
	if r == float64(int(r)) {
		return fmt.Sprintf("%.0f", r)
	}
	return fmt.Sprintf("%g", r)
}

func evalJSON(s string) string {
	numericKeys := []string{"price", "subtotal", "service_charge", "tax", "discount", "grand_total", "total", "quantity", "ai_confidence", "confidence"}
	for _, key := range numericKeys {
		re := regexp.MustCompile(`"` + key + `"\s*:\s*"?(\d+(?:\.\d+)?(?:\s*[-+*/]\s*\d+(?:\.\d+)?)+)"?`)
		s = re.ReplaceAllStringFunc(s, func(m string) string {
			parts := re.FindStringSubmatch(m)
			if len(parts) < 2 {
				return m
			}
			return `"` + key + `": ` + evalExpr(parts[1])
		})
	}
	return s
}

func (m *ocrService) parseStructuredJSON(rawJSON string) (*ocrStructuredResult, error) {
	rawJSON = strings.TrimSpace(rawJSON)
	rawJSON = strings.TrimPrefix(rawJSON, "```json")
	rawJSON = strings.TrimPrefix(rawJSON, "```")
	rawJSON = strings.TrimSuffix(rawJSON, "```")
	rawJSON = strings.TrimSpace(rawJSON)

	// Strip <think>...</think> blocks (qwen model outputs chain-of-thought preamble)
	for {
		start := strings.Index(rawJSON, "<think>")
		if start < 0 {
			break
		}
		end := strings.Index(rawJSON[start:], "</think>")
		if end < 0 {
			rawJSON = rawJSON[:start]
			break
		}
		rawJSON = rawJSON[:start] + rawJSON[start+end+len("</think>"):]
	}

	// Find the last complete JSON object (qwen may output draft + think + final)
	{
		end := strings.LastIndex(rawJSON, "}")
		if end >= 0 {
			depth := 0
			for i := end; i >= 0; i-- {
				switch rawJSON[i] {
				case '}':
					depth++
				case '{':
					depth--
					if depth == 0 {
						rawJSON = rawJSON[i : end+1]
						goto parsed
					}
				}
			}
		}
		start := strings.Index(rawJSON, "{")
		if start >= 0 {
			rawJSON = rawJSON[start:]
		}
	}
parsed:

	rawJSON = evalJSON(rawJSON)

	rawJSON = fixDateField(rawJSON)

	var parsed ocrStructuredResult
	if err := json.Unmarshal([]byte(rawJSON), &parsed); err != nil {
		return nil, fmt.Errorf("failed to parse structured JSON: %w, raw: %s", err, rawJSON)
	}
	if parsed.Error != "" {
		return nil, fmt.Errorf("%s", parsed.Error)
	}
	return &parsed, nil
}

func fixDateField(raw string) string {
	re := regexp.MustCompile(`"date"\s*:\s*(\d{4})`)
	return re.ReplaceAllString(raw, `"date": "${1}"`)
}

func (m *ocrService) buildOCRResult(parsed *ocrStructuredResult) *domain.OCRResult {
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

	// ponytail: if qty>1 and unit_price not round (divisible by 1000) but line_total is,
	// the model likely divided a round total price → merge back to qty=1
	round := func(v float64) bool { return v == float64(int(v/1000))*1000 }
	for i := range items {
		p := items[i].Price
		q := items[i].Quantity
		if q > 1 && !round(p) && round(p*float64(q)) {
			items[i].Quantity = 1
			items[i].Price = p * float64(q)
		}
	}

	// ponytail: if items_total > subtotal, some item's unit_price may be line_total, not per-unit
	if parsed.Subtotal > 0 {
		incomplete := true
		for attempt := 0; incomplete && attempt < 3; attempt++ {
			itemsTotal = 0
			for _, item := range items {
				qty := item.Quantity
				if qty < 1 {
					qty = 1
				}
				itemsTotal += item.Price * float64(qty)
			}
			diff := itemsTotal - parsed.Subtotal
			if diff > 0 && diff < 200000 {
				incomplete = false
				for i := range items {
					p := items[i].Price
					q := items[i].Quantity
					if q > 1 && round(p) && p*float64(q-1) == diff {
						items[i].Price = p / float64(q)
						incomplete = true
						break
					}
				}
			} else {
				incomplete = false
			}
		}
	}

	// recompute itemsTotal after corrections
	itemsTotal = 0
	for _, item := range items {
		qty := item.Quantity
		if qty < 1 {
			qty = 1
		}
		itemsTotal += item.Price * float64(qty)
	}

	confidence := parsed.AiConfidence
	if confidence < 0 || confidence > 100 {
		confidence = 100
	}

	total := parsed.GrandTotal
	if total <= 0 {
		total = itemsTotal + parsed.ServiceCharge + parsed.Tax
	}

	discount := parsed.Discount
	if discount < 0 {
		discount = -discount
	}

	// override: compute confidence from data quality, not AI self-assessment
	subtotal := itemsTotal
	if parsed.Subtotal > 0 {
		subtotal = parsed.Subtotal
	}
	if subtotal > 0 && itemsTotal > 0 {
		itemRatio := itemsTotal / subtotal
		switch {
		case itemRatio < 0.3:
			confidence = math.Min(confidence, 20)
		case itemRatio < 0.5:
			confidence = math.Min(confidence, 35)
		case itemRatio < 0.7:
			confidence = math.Min(confidence, 50)
		case itemRatio < 0.85:
			confidence = math.Min(confidence, 65)
		case itemRatio > 1.15:
			confidence = math.Min(confidence, 40)
		}
	}

	computedTotal := itemsTotal + parsed.ServiceCharge + parsed.Tax
	if computedTotal > 0 && total > 0 {
		gvtDiff := math.Abs(computedTotal/total - 1)
		switch {
		case gvtDiff > 0.4:
			confidence = math.Min(confidence, 25)
		case gvtDiff > 0.2:
			confidence = math.Min(confidence, 50)
		case gvtDiff > 0.1:
			confidence = math.Min(confidence, 70)
		}
	}

	if confidence < 0 {
		confidence = 0
	}
	if confidence > 100 {
		confidence = 100
	}

	// ponytail: if all qty=1 with many items > 50k, model likely used total_prices as unit_prices
	if len(items) >= 3 {
		allOne := true
		expensive := 0
		for _, it := range items {
			if it.Quantity != 1 {
				allOne = false
				break
			}
			if it.Price > 50000 {
				expensive++
			}
		}
		if allOne && expensive >= 3 {
			confidence = math.Min(confidence, 40)
		}
	}

	return &domain.OCRResult{
		Title:         title,
		Date:          date,
		Items:         items,
		Subtotal:      subtotal,
		ServiceCharge: parsed.ServiceCharge,
		ServiceMode:   "amount",
		Tax:           parsed.Tax,
		TaxMode:       "amount",
		Discount:      discount,
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

	type modelCfg struct {
		name      string
		maxTokens int
	}
	models := []modelCfg{
		{"llama-3.3-70b-versatile", 0},
		{"qwen/qwen3-32b", 0}, // uses Groq default; max_tokens > 0 exceeds 6K TPM
		{"llama-3.1-8b-instant", 2048},
	}
	userMsg := "Here is the raw OCR text from a receipt image:\n\n" + rawText

	client := m.httpClient
	var lastErr error
	for _, mc := range models {
		reqBody := map[string]interface{}{
			"model":       mc.name,
			"messages": []chatMessage{
				{Role: "system", Content: buildPrompt(rawText)},
				{Role: "user", Content: userMsg},
			},
			"temperature": 0,
		}
		if mc.maxTokens > 0 {
			reqBody["max_tokens"] = mc.maxTokens
		}

		jsonBytes, err := json.Marshal(reqBody)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal request: %w", err)
		}

		req, err := http.NewRequestWithContext(ctx, "POST", "https://api.groq.com/openai/v1/chat/completions", bytes.NewBuffer(jsonBytes))
		if err != nil {
			return nil, fmt.Errorf("failed to create request: %w", err)
		}
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+m.groqKey)

		resp, err := client.Do(req)
		if err != nil {
			log.Printf("[OCR] Groq %s HTTP failed: %v", mc.name, err)
			lastErr = fmt.Errorf("Groq %s: %w", mc.name, err)
			continue
		}

		body, readErr := io.ReadAll(resp.Body)
		resp.Body.Close()
		if readErr != nil {
			log.Printf("[OCR] Groq %s read body failed: %v", mc.name, readErr)
			lastErr = fmt.Errorf("Groq %s read body: %w", mc.name, readErr)
			continue
		}

		if resp.StatusCode == http.StatusTooManyRequests {
			log.Printf("[OCR] Groq %s rate limited, trying next model...", mc.name)
			lastErr = fmt.Errorf("Groq %s: rate limited", mc.name)
			continue
		}

		if resp.StatusCode != http.StatusOK {
			log.Printf("[OCR] Groq %s error: status=%d body=%s", mc.name, resp.StatusCode, string(body))
			lastErr = fmt.Errorf("Groq %s returned status %d", mc.name, resp.StatusCode)
			continue
		}

		var groqResp chatResponse
		if err := json.Unmarshal(body, &groqResp); err != nil {
			log.Printf("[OCR] Groq %s parse error: %v", mc.name, err)
			lastErr = fmt.Errorf("Groq %s parse: %w", mc.name, err)
			continue
		}

		if len(groqResp.Choices) == 0 || groqResp.Choices[0].Message.Content == "" {
			log.Printf("[OCR] Groq %s empty response", mc.name)
			lastErr = fmt.Errorf("Groq %s: empty response", mc.name)
			continue
		}

		parsed, err := m.parseStructuredJSON(groqResp.Choices[0].Message.Content)
		if err != nil {
			log.Printf("[OCR] Groq %s JSON parse error: %v, raw=%s", mc.name, err, groqResp.Choices[0].Message.Content)
			lastErr = fmt.Errorf("Groq %s result: %w", mc.name, err)
			continue
		}

		log.Printf("[OCR] Groq %s succeeded", mc.name)
		return m.buildOCRResult(parsed), nil
	}

	return nil, lastErr
}

// ------- Image resize (keep token cost predictable) -------

func resizeImage(data []byte, maxDim int) ([]byte, error) {
	src, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		return nil, err
	}
	bounds := src.Bounds()
	w, h := bounds.Dx(), bounds.Dy()
	if w <= maxDim && h <= maxDim {
		return data, nil
	}
	scale := float64(maxDim) / float64(w)
	if h > w {
		scale = float64(maxDim) / float64(h)
	}
	nw, nh := int(float64(w)*scale), int(float64(h)*scale)
	if nw < 1 {
		nw = 1
	}
	if nh < 1 {
		nh = 1
	}
	dst := image.NewRGBA(image.Rect(0, 0, nw, nh))
	// bilinear-like interpolation
	for y := 0; y < nh; y++ {
		sy := float64(y) / float64(nh-1) * float64(h-1)
		for x := 0; x < nw; x++ {
			sx := float64(x) / float64(nw-1) * float64(w-1)
			xi, yi := int(sx), int(sy)
			if xi >= w-1 {
				xi = w - 2
			}
			if yi >= h-1 {
				yi = h - 2
			}
			xf, yf := sx-float64(xi), sy-float64(yi)
			c00 := color.GrayModel.Convert(src.At(xi, yi)).(color.Gray)
			c10 := color.GrayModel.Convert(src.At(xi+1, yi)).(color.Gray)
			c01 := color.GrayModel.Convert(src.At(xi, yi+1)).(color.Gray)
			c11 := color.GrayModel.Convert(src.At(xi+1, yi+1)).(color.Gray)
			r := float64(c00.Y)*(1-xf)*(1-yf) + float64(c10.Y)*xf*(1-yf) + float64(c01.Y)*(1-xf)*yf + float64(c11.Y)*xf*yf
			dst.Set(x, y, color.Gray{Y: uint8(r + 0.5)})
		}
	}
	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, dst, &jpeg.Options{Quality: 85}); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// ------- Groq Vision API (primary) -------

func (m *ocrService) extractWithVision(ctx context.Context, imageBytes []byte) (*domain.OCRResult, error) {
	if m.groqKey == "" {
		return nil, fmt.Errorf("Groq API key not configured")
	}

	resized, err := resizeImage(imageBytes, 1024)
	if err != nil {
		return nil, fmt.Errorf("image resize failed: %w", err)
	}

	b64 := base64.StdEncoding.EncodeToString(resized)
	dataURI := fmt.Sprintf("data:image/jpeg;base64,%s", b64)

	reqBody := map[string]interface{}{
		"model": "meta-llama/llama-4-scout-17b-16e-instruct",
		"messages": []interface{}{
			map[string]interface{}{
				"role":    "system",
				"content": buildVisionPrompt(),
			},
			map[string]interface{}{
				"role": "user",
				"content": []interface{}{
					map[string]interface{}{
						"type": "image_url",
						"image_url": map[string]string{
							"url": dataURI,
						},
					},
					map[string]interface{}{
						"type": "text",
						"text": "Extract the receipt fields as JSON following the system prompt instructions.",
					},
				},
			},
		},
		"temperature": 0,
		"max_tokens":  4096,
		"response_format": map[string]string{
			"type": "json_object",
		},
	}

	jsonBytes, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal vision request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", "https://api.groq.com/openai/v1/chat/completions", bytes.NewBuffer(jsonBytes))
	if err != nil {
		return nil, fmt.Errorf("failed to create vision request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+m.groqKey)

	resp, err := m.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("Groq vision HTTP failed: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Groq vision returned status %d: %s", resp.StatusCode, string(body))
	}

	var groqResp chatResponse
	if err := json.Unmarshal(body, &groqResp); err != nil {
		return nil, fmt.Errorf("Groq vision parse error: %w", err)
	}

	if len(groqResp.Choices) == 0 || groqResp.Choices[0].Message.Content == "" {
		return nil, fmt.Errorf("Groq vision empty response")
	}

	content := groqResp.Choices[0].Message.Content
	parsed, err := m.parseStructuredJSON(content)
	if err != nil {
		return nil, fmt.Errorf("Groq vision JSON parse error: %w, raw=%s", err, content)
	}

	return m.buildOCRResult(parsed), nil
}

// ------- Main entry point -------

func (m *ocrService) ExtractItems(ctx context.Context, imageBytes []byte) (*domain.OCRResult, error) {
	// Step 1: Try Groq Vision API directly (fastest path)
	if m.groqKey != "" {
		result, err := m.extractWithVision(ctx, imageBytes)
		if err == nil {
			log.Printf("[OCR SUCCESS] Structured %d items via Groq Vision (confidence=%.1f%%)", len(result.Items), result.Confidence)
			return result, nil
		}
		log.Printf("[OCR] Groq Vision failed: %v", err)
	}

	// Step 2: Fallback — PaddleOCR extracts raw text, then Groq structures it
	paddleRes, err := m.extractTextWithPaddle(ctx, imageBytes)
	if err != nil {
		return nil, fmt.Errorf("PaddleOCR extraction failed: %w", err)
	}

	log.Printf("[OCR] Raw text extracted (%d chars)", len(paddleRes.RawText))
	log.Printf("[OCR] Raw text (%d chars):\n%s", len(paddleRes.RawText), paddleRes.RawText)

	if m.groqKey != "" {
		result, err := m.structureWithGroq(ctx, paddleRes.RawText)
		if err == nil {
			log.Printf("[OCR SUCCESS] Structured %d items via PaddleOCR -> Groq (confidence=%.1f%%)", len(result.Items), result.Confidence)
			return result, nil
		}
		log.Printf("[OCR] Groq failed: %v", err)
	}

	return nil, fmt.Errorf("all OCR methods failed")
}
