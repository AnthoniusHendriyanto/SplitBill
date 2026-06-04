package domain

import "context"

type PremiumUsecase interface {
	Subscribe(ctx context.Context, userID string, req *PremiumSubscribeRequest) (*PremiumSubscribeResponse, error)
	ConfirmPayment(ctx context.Context, req *PremiumCallbackRequest) error
}
