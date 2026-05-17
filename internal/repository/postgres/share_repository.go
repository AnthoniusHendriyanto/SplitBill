package postgres

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/user/split-mate/internal/domain"
)

type shareRepository struct {
	Pool *pgxpool.Pool
}

func NewShareRepository(pool *pgxpool.Pool) domain.ShareRepository {
	return &shareRepository{Pool: pool}
}

func (r *shareRepository) Create(ctx context.Context, share *domain.Share) error {
	shareToken := generateToken()
	viewToken := generateToken()

	query := `
		INSERT INTO shares (id, bill_id, share_token, view_token, allow_edit, max_views, current_views, expires_at, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`
	_, err := r.Pool.Exec(ctx, query,
		share.ID, share.BillID, shareToken, viewToken, share.AllowEdit,
		share.MaxViews, share.CurrentViews, share.ExpiresAt, share.CreatedAt,
	)
	if err != nil {
		return err
	}

	share.ShareToken = shareToken
	share.ViewToken = viewToken

	return nil
}

func (r *shareRepository) GetByShareToken(ctx context.Context, token string) (domain.Share, error) {
	query := `
		SELECT id, bill_id, share_token, view_token, allow_edit, max_views, current_views, expires_at, created_at
		FROM shares WHERE share_token = $1
	`
	var share domain.Share
	err := r.Pool.QueryRow(ctx, query, token).Scan(
		&share.ID, &share.BillID, &share.ShareToken, &share.ViewToken,
		&share.AllowEdit, &share.MaxViews, &share.CurrentViews,
		&share.ExpiresAt, &share.CreatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.Share{}, domain.ErrNotFound
	}

	if share.ExpiresAt != nil && time.Now().After(*share.ExpiresAt) {
		return domain.Share{}, domain.ErrNotFound
	}

	if share.MaxViews != nil && share.CurrentViews >= *share.MaxViews {
		return domain.Share{}, domain.ErrNotFound
	}

	return share, err
}

func (r *shareRepository) IncrementViews(ctx context.Context, token string) error {
	query := `UPDATE shares SET current_views = current_views + 1 WHERE share_token = $1`
	_, err := r.Pool.Exec(ctx, query, token)
	return err
}

func (r *shareRepository) Delete(ctx context.Context, token string) error {
	query := `DELETE FROM shares WHERE share_token = $1`
	_, err := r.Pool.Exec(ctx, query, token)
	return err
}

func generateToken() string {
	bytes := make([]byte, 32)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}