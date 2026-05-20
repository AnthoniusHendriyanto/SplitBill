package domain

import "context"

type OCRResult struct {
	Title         string    `json:"title"`
	Items         []OCRItem `json:"items"`
	ServiceCharge float64   `json:"service_charge"`
	ServiceMode   string    `json:"service_mode"`
	Tax           float64   `json:"tax"`
	TaxMode       string    `json:"tax_mode"`
}

type OCRItem struct {
	Name       string  `json:"name"`
	Price      float64 `json:"price"`
	Confidence float64 `json:"confidence,omitempty"`
	X          float64 `json:"x,omitempty"`
	Y          float64 `json:"y,omitempty"`
}

type OCRService interface {
	ExtractItems(ctx context.Context, imageBytes []byte) (*OCRResult, error)
}
