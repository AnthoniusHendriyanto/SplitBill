package domain

import "context"

type BillUsecase interface {
	Create(ctx context.Context, userID string, req *CreateBillRequest) (*Bill, error)
	Fetch(ctx context.Context, userID string, page, limit int, fromDate, toDate string) (*BillListResponse, error)
	GetByID(ctx context.Context, userID, billID string) (*BillDetailResponse, error)
	Delete(ctx context.Context, userID, billID string) error
	ProcessOCR(ctx context.Context, userID string, imageBytes []byte) (*OCRResult, error)
	GetUsage(ctx context.Context, userID string) (*UsageResponse, error)
}