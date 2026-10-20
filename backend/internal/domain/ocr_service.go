package domain

import "context"

type OCRResult struct {
	Title         string    `json:"title"`
	Date          string    `json:"date"`
	Items         []OCRItem `json:"items"`
	Subtotal      float64   `json:"subtotal"`
	ServiceCharge float64   `json:"service_charge"`
	ServiceMode   string    `json:"service_mode"`
	Tax           float64   `json:"tax"`
	TaxMode       string    `json:"tax_mode"`
	Discount      float64   `json:"discount"`
	Total         float64   `json:"total"`
	Confidence    float64   `json:"confidence"`
}

type OCRItem struct {
	Name       string  `json:"name"`
	Price      float64 `json:"price"`
	Quantity   int     `json:"quantity,omitempty"`
	Confidence float64 `json:"confidence,omitempty"`
	X          float64 `json:"x,omitempty"`
	Y          float64 `json:"y,omitempty"`
}

type OCRService interface {
	ExtractItems(ctx context.Context, imageBytes []byte) (*OCRResult, error)
}
