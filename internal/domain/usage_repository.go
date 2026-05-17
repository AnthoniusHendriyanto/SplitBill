package domain

import "context"

type UsageRepository interface {
	GetMonthlyUsage(ctx context.Context, userID, action, month string) (UsageTracking, error)
	IncrementUsage(ctx context.Context, userID, action, month string) error
	ResetMonthlyUsage(ctx context.Context, userID, action, month string) error
}