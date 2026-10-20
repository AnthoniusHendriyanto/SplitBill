package postgres

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/user/split-mate/internal/domain"
)

type invitationRepository struct {
	Pool *pgxpool.Pool
}

func NewInvitationRepository(pool *pgxpool.Pool) domain.InvitationRepository {
	return &invitationRepository{Pool: pool}
}

func (r *invitationRepository) Create(ctx context.Context, inv *domain.Invitation) error {
	inv.ID = uuid.New().String()
	_, err := r.Pool.Exec(ctx, `
		INSERT INTO invitations (id, from_user_id, to_email, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, NOW(), NOW())
	`, inv.ID, inv.FromUserID, inv.ToEmail, inv.Status)
	return err
}

func (r *invitationRepository) GetByID(ctx context.Context, id string) (domain.Invitation, error) {
	var inv domain.Invitation
	err := r.Pool.QueryRow(ctx, `
		SELECT id, from_user_id, to_email, COALESCE(to_user_id::text, ''), status, created_at::text, updated_at::text
		FROM invitations WHERE id = $1
	`, id).Scan(&inv.ID, &inv.FromUserID, &inv.ToEmail, &inv.ToUserID, &inv.Status, &inv.CreatedAt, &inv.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.Invitation{}, domain.ErrNotFound
	}
	return inv, err
}

func (r *invitationRepository) GetByUser(ctx context.Context, userID string) ([]domain.Invitation, error) {
	rows, err := r.Pool.Query(ctx, `
		SELECT id, from_user_id, to_email, COALESCE(to_user_id::text, ''), status, created_at::text, updated_at::text
		FROM invitations WHERE from_user_id = $1 OR to_user_id = $1 OR LOWER(to_email)=(SELECT LOWER(email) FROM users WHERE id=$1)
		ORDER BY created_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var invs []domain.Invitation
	for rows.Next() {
		var inv domain.Invitation
		if err := rows.Scan(&inv.ID, &inv.FromUserID, &inv.ToEmail, &inv.ToUserID, &inv.Status, &inv.CreatedAt, &inv.UpdatedAt); err != nil {
			return nil, err
		}
		invs = append(invs, inv)
	}
	return invs, rows.Err()
}

func (r *invitationRepository) GetByEmail(ctx context.Context, email string) ([]domain.Invitation, error) {
	rows, err := r.Pool.Query(ctx, `
		SELECT id, from_user_id, to_email, COALESCE(to_user_id::text, ''), status, created_at::text, updated_at::text
		FROM invitations WHERE to_email = $1 ORDER BY created_at DESC
	`, email)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var invs []domain.Invitation
	for rows.Next() {
		var inv domain.Invitation
		if err := rows.Scan(&inv.ID, &inv.FromUserID, &inv.ToEmail, &inv.ToUserID, &inv.Status, &inv.CreatedAt, &inv.UpdatedAt); err != nil {
			return nil, err
		}
		invs = append(invs, inv)
	}
	return invs, rows.Err()
}

func (r *invitationRepository) UpdateStatus(ctx context.Context, id, status, toUserID string) error {
	tx, err := r.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	var fromID string
	err = tx.QueryRow(ctx, `UPDATE invitations SET status=$1,to_user_id=$2,updated_at=NOW() WHERE id=$3 AND status='pending' AND LOWER(to_email)=(SELECT LOWER(email) FROM users WHERE id=$2) RETURNING from_user_id`, status, toUserID, id).Scan(&fromID)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.ErrNotFound
	}
	if err != nil {
		return err
	}
	if status == "accepted" {
		for _, pair := range [][2]string{{fromID, toUserID}, {toUserID, fromID}} {
			_, err = tx.Exec(ctx, `INSERT INTO contacts(id,user_id,name,connected_user_id) SELECT $1,$2,name,id FROM users WHERE id=$3 AND NOT EXISTS(SELECT 1 FROM contacts WHERE user_id=$2 AND connected_user_id=$3)`, uuid.NewString(), pair[0], pair[1])
			if err != nil {
				return err
			}
		}
	}
	return tx.Commit(ctx)
}
