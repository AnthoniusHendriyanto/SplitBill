package usecase

import (
	"context"

	"github.com/user/split-mate/internal/domain"
)

type AuthUsecase interface {
	Register(ctx context.Context, req *domain.RegisterRequest) (*domain.AuthResponse, error)
	Login(ctx context.Context, req *domain.LoginRequest) (*domain.AuthResponse, error)
	RefreshToken(ctx context.Context, refreshToken string) (*domain.AuthResponse, error)
	Logout(ctx context.Context, refreshToken string) error
	GetMe(ctx context.Context, userID string) (*domain.UserResponse, error)
	UpdateMe(ctx context.Context, userID string, req *domain.UpdateUserRequest) (*domain.UserResponse, error)
	ValidateToken(tokenString string) (string, error)
}

type BillUsecase interface {
	Create(ctx context.Context, userID string, req *domain.CreateBillRequest) (*domain.Bill, error)
	Fetch(ctx context.Context, userID string, page, limit int, fromDate, toDate string) (*domain.BillListResponse, error)
	GetByID(ctx context.Context, userID, billID string) (*domain.BillDetailResponse, error)
	Delete(ctx context.Context, userID, billID string) error
	ProcessOCR(ctx context.Context, userID string, imageBytes []byte) (*domain.OCRResult, error)
	GetUsage(ctx context.Context, userID string) (*domain.UsageResponse, error)
}

type PremiumUsecase interface {
	Subscribe(ctx context.Context, userID string, req *domain.PremiumSubscribeRequest) (*domain.PremiumSubscribeResponse, error)
	ConfirmPayment(ctx context.Context, req *domain.PremiumCallbackRequest) error
}
