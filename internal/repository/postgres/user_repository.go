package postgres

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/user/split-mate/internal/domain"
)

type userRepository struct {
	Pool *pgxpool.Pool
}

func NewUserRepository(pool *pgxpool.Pool) domain.UserRepository {
	return &userRepository{Pool: pool}
}

func (r *userRepository) Create(ctx context.Context, user *domain.User) error {
	user.ID = uuid.New().String()
	query := `
		INSERT INTO users (id, email, password_hash, name, tier, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`
	_, err := r.Pool.Exec(ctx, query,
		user.ID, user.Email, user.PasswordHash, user.Name, user.Tier, user.CreatedAt, user.UpdatedAt)
	return err
}

func (r *userRepository) GetByID(ctx context.Context, id string) (domain.User, error) {
	query := `
		SELECT id, email, password_hash, name, tier, 
		       COALESCE(stripe_customer_id, ''), 
		       COALESCE(stripe_subscription_id, ''), 
		       premium_expires_at, created_at, updated_at
		FROM users WHERE id = $1
	`
	var user domain.User
	err := r.Pool.QueryRow(ctx, query, id).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.Name, &user.Tier,
		&user.PaymentCustomerID, &user.PaymentSubscriptionID, &user.PremiumExpiresAt,
		&user.CreatedAt, &user.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.User{}, domain.ErrNotFound
	}
	return user, err
}

func (r *userRepository) GetByEmail(ctx context.Context, email string) (domain.User, error) {
	query := `
		SELECT id, email, password_hash, name, tier, 
		       COALESCE(stripe_customer_id, ''), 
		       COALESCE(stripe_subscription_id, ''), 
		       premium_expires_at, created_at, updated_at
		FROM users WHERE email = $1
	`
	var user domain.User
	err := r.Pool.QueryRow(ctx, query, email).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.Name, &user.Tier,
		&user.PaymentCustomerID, &user.PaymentSubscriptionID, &user.PremiumExpiresAt,
		&user.CreatedAt, &user.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.User{}, domain.ErrNotFound
	}
	return user, err
}

func (r *userRepository) Update(ctx context.Context, user *domain.User) error {
	query := `
		UPDATE users SET name = $1, password_hash = $2, updated_at = $3
		WHERE id = $4
	`
	_, err := r.Pool.Exec(ctx, query, user.Name, user.PasswordHash, user.UpdatedAt, user.ID)
	return err
}

func (r *userRepository) UpdateTier(ctx context.Context, userID string, tier string, expiresAt *string) error {
	var query string
	var args []interface{}

	if expiresAt != nil {
		query = `UPDATE users SET tier = $1, premium_expires_at = $2, updated_at = NOW() WHERE id = $3`
		args = []interface{}{tier, *expiresAt, userID}
	} else {
		query = `UPDATE users SET tier = $1, premium_expires_at = NULL, updated_at = NOW() WHERE id = $2`
		args = []interface{}{tier, userID}
	}

	_, err := r.Pool.Exec(ctx, query, args...)
	return err
}

func (r *userRepository) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM users WHERE id = $1`
	_, err := r.Pool.Exec(ctx, query, id)
	return err
}