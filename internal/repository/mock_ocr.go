package repository

import (
	"context"
	"github.com/user/split-mate/internal/domain"
)

type mockOCRService struct{}

func NewMockOCRService() domain.OCRService {
	return &mockOCRService{}
}

func (m *mockOCRService) ExtractItems(ctx context.Context, imageBytes []byte) (*domain.OCRResult, error) {
	// Mock implementation returning premium dummy data
	return &domain.OCRResult{
		Items: []domain.OCRItem{
			{Name: "Salmon Truffle Nigiri", Price: 85000},
			{Name: "Wagyu Ribeye MB9+", Price: 450000},
			{Name: "Hokkaido Scallops", Price: 120000},
			{Name: "Premium Sake Flight", Price: 210000},
			{Name: "Yuzu Sorbet", Price: 45000},
			{Name: "Oolong Tea (Refill)", Price: 15000},
		},
		ServiceCharge: 0.10, // 10%
		Tax:           0.11, // 11% (PPN)
	}, nil
}
