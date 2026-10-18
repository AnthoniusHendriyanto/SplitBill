package domain

import "context"

type UserRepository interface {
	Create(ctx context.Context, user *User) error
	GetByID(ctx context.Context, id string) (User, error)
	GetByEmail(ctx context.Context, email string) (User, error)
	GetByName(ctx context.Context, name string) (User, error)
	Update(ctx context.Context, user *User) error
	UpdateTier(ctx context.Context, userID string, tier string, expiresAt *string) error
	Delete(ctx context.Context, id string) error
	SaveRefreshToken(ctx context.Context, userID, token string, expiresAt int64) error
	DeleteRefreshToken(ctx context.Context, token string) error
	ReplaceRefreshToken(ctx context.Context, oldToken, newToken, userID string, expiresAt int64) error
}
