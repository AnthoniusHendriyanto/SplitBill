package domain

import "context"

type UserRepository interface {
	Create(ctx context.Context, user *User) error
	GetByID(ctx context.Context, id string) (User, error)
	GetByEmail(ctx context.Context, email string) (User, error)
	Update(ctx context.Context, user *User) error
	UpdateTier(ctx context.Context, userID string, tier string, expiresAt *string) error
	Delete(ctx context.Context, id string) error
}