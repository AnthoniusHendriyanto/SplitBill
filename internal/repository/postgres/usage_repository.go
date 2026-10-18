package postgres

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/user/split-mate/internal/domain"
)

type usageRepository struct {
	Pool *pgxpool.Pool
}

func NewUsageRepository(pool *pgxpool.Pool) domain.UsageRepository {
	return &usageRepository{Pool: pool}
}

func (r *usageRepository) GetMonthlyUsage(ctx context.Context, userID, action, month string) (domain.UsageTracking, error) {
	query := `
		SELECT id, user_id, action, count, month, created_at
		FROM usage_tracking WHERE user_id = $1 AND action = $2 AND month = $3
	`
	var usage domain.UsageTracking
	err := r.Pool.QueryRow(ctx, query, userID, action, month).Scan(
		&usage.ID, &usage.UserID, &usage.Action, &usage.Count, &usage.Month, &usage.CreatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.UsageTracking{
			UserID: userID,
			Action: action,
			Month:  month,
			Count:  0,
		}, nil
	}
	return usage, err
}

func (r *usageRepository) IncrementUsage(ctx context.Context, userID, action, month string) error {
	query := `
		INSERT INTO usage_tracking (id, user_id, action, count, month, created_at)
		VALUES (gen_random_uuid(), $1, $2, 1, $3, $4)
		ON CONFLICT (user_id, action, month) 
		DO UPDATE SET count = usage_tracking.count + 1
	`
	_, err := r.Pool.Exec(ctx, query, userID, action, month, time.Now())
	return err
}

func (r *usageRepository) GetTierLimit(ctx context.Context, tier string) (domain.TierLimit, error) {
	query := `SELECT tier, monthly_bill_limit, monthly_ocr_limit FROM tier_limits WHERE tier = $1`
	var tl domain.TierLimit
	err := r.Pool.QueryRow(ctx, query, tier).Scan(&tl.Tier, &tl.MonthlyBillLimit, &tl.MonthlyOCRLimit)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.TierLimit{Tier: tier, MonthlyBillLimit: 50, MonthlyOCRLimit: 10}, nil
	}
	return tl, err
}

func (r *usageRepository) ResetMonthlyUsage(ctx context.Context, userID, action, month string) error {
	query := `
		INSERT INTO usage_tracking (id, user_id, action, count, month, created_at)
		VALUES (gen_random_uuid(), $1, $2, 0, $3, $4)
		ON CONFLICT (user_id, action, month) 
		DO UPDATE SET count = 0
	`
	_, err := r.Pool.Exec(ctx, query, userID, action, month, time.Now())
	return err
}
