package postgres

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/user/split-mate/internal/domain"
)

type shareRepository struct{ Pool *pgxpool.Pool }

// NewShareRepository uses the concrete pool while keeping the repository small and testable.
func NewShareRepository(pool *pgxpool.Pool) domain.ShareRepository {
	return &shareRepository{Pool: pool}
}

func (r *shareRepository) Create(ctx context.Context, billID, userID, tokenHash string, expiresAt time.Time) error {
	_, err := r.Pool.Exec(ctx, `INSERT INTO share_tokens(bill_id,created_by,token_hash,expires_at) VALUES($1,$2,$3,$4)`, billID, userID, tokenHash, expiresAt)
	return err
}

func (r *shareRepository) GetByTokenHash(ctx context.Context, tokenHash string) (string, error) {
	var billID string
	err := r.Pool.QueryRow(ctx, `SELECT bill_id FROM share_tokens WHERE token_hash=$1 AND revoked_at IS NULL AND expires_at>NOW()`, tokenHash).Scan(&billID)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", domain.ErrNotFound
	}
	return billID, err
}

func (r *shareRepository) RevokeByBillID(ctx context.Context, billID, userID string) error {
	result, err := r.Pool.Exec(ctx, `UPDATE share_tokens SET revoked_at=NOW() WHERE bill_id=$1 AND created_by=$2 AND revoked_at IS NULL`, billID, userID)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}
