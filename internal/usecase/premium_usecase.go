package usecase

import (
	"context"
	"fmt"
	"time"

	"github.com/user/split-mate/internal/config"
	"github.com/user/split-mate/internal/domain"
)

type premiumUsecase struct {
	userRepo domain.UserRepository
	cfg      *config.Config
}

func NewPremiumUsecase(userRepo domain.UserRepository, cfg *config.Config) domain.PremiumUsecase {
	return &premiumUsecase{userRepo: userRepo, cfg: cfg}
}

func (pu *premiumUsecase) Subscribe(ctx context.Context, userID string, req *domain.PremiumSubscribeRequest) (*domain.PremiumSubscribeResponse, error) {
	paymentID := fmt.Sprintf("PMT-%s-%d", userID[:8], time.Now().Unix())

	return &domain.PremiumSubscribeResponse{
		PaymentID:     paymentID,
		Amount:        39000,
		BankName:      "Bank Mandiri",
		AccountNumber: "123-456-7890",
		AccountName:   "PT SplitMate Teknologi",
		Status:        "pending",
		ExpiresAt:     time.Now().Add(24 * time.Hour).Format(time.RFC3339),
	}, nil
}

func (pu *premiumUsecase) ConfirmPayment(ctx context.Context, req *domain.PremiumCallbackRequest) error {
	expiresAt := time.Now().Add(30 * 24 * time.Hour)
	expiresAtStr := expiresAt.Format(time.RFC3339)

	if err := pu.userRepo.UpdateTier(ctx, req.UserID, "premium", &expiresAtStr); err != nil {
		return fmt.Errorf("failed to activate premium: %w", err)
	}

	return nil
}
