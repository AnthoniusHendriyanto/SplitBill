package repository

import (
	"context"
	"bytes"
	"github.com/user/split-mate/internal/domain"
	vision "cloud.google.com/go/vision/apiv1"
)

type googleVisionOCRService struct {
	client *vision.ImageAnnotatorClient
}

func NewGoogleVisionOCRService(ctx context.Context) (domain.OCRService, error) {
	client, err := vision.NewImageAnnotatorClient(ctx)
	if err != nil {
		return nil, err
	}
	return &googleVisionOCRService{client: client}, nil
}

func (s *googleVisionOCRService) ExtractItems(ctx context.Context, imageBytes []byte) (*domain.OCRResult, error) {
	// 1. Convert bytes to Vision Image
	img, err := vision.NewImageFromReader(bytes.NewReader(imageBytes))
	if err != nil {
		return nil, err
	}

	// 2. Heavy Lifting: Document Text Detection
	annotation, err := s.client.DetectDocumentText(ctx, img, nil)
	if err != nil {
		return nil, err
	}

	if annotation == nil {
		return &domain.OCRResult{Items: []domain.OCRItem{}}, nil
	}

	// 3. Logic: Extract Item Lines (Simplified for now)
	// In a real implementation, we would parse blocks/paragraphs for prices
	return &domain.OCRResult{
		Items: []domain.OCRItem{
			{Name: "Detected Item", Price: 10000}, // Placeholder for parsing logic
		},
	}, nil
}
