package domain

import "context"

type OCRResult struct {
	Items         []OCRItem `json:"items"`
	ServiceCharge float64   `json:"service_charge"`
	Tax           float64   `json:"tax"`
}

type OCRItem struct {
	Name  string  `json:"name"`
	Price float64 `json:"price"`
}

type OCRService interface {
	ExtractItems(ctx context.Context, imageBytes []byte) (*OCRResult, error)
}
