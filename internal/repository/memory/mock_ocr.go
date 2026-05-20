package memory

import (
	"context"

	"github.com/user/split-mate/internal/domain"
)

type ocrService struct{}

func NewOCRService() domain.OCRService {
	return &ocrService{}
}

func (s *ocrService) ExtractItems(_ context.Context, _ []byte) (*domain.OCRResult, error) {
	return &domain.OCRResult{
		Title: "The Cafe",
		Items: []domain.OCRItem{
			{Name: "Grilled Salmon", Price: 250000},
			{Name: "Caesar Salad", Price: 85000},
			{Name: "Mineral Water", Price: 25000},
		},
		ServiceCharge: 10.0,
		ServiceMode:   "percent",
		Tax:           11.0,
		TaxMode:       "percent",
	}, nil
}
