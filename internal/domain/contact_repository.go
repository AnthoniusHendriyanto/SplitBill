package domain

import "context"

type Contact struct {
	Email           string `json:"email,omitempty"`
	ID              string `json:"id"`
	UserID          string `json:"user_id"`
	Name            string `json:"name"`
	ConnectedUserID string `json:"connected_user_id,omitempty"`
	CreatedAt       string `json:"created_at"`
}

type ContactRepository interface {
	GetByUserID(ctx context.Context, userID string) ([]Contact, error)
	Create(ctx context.Context, contact *Contact) error
	Delete(ctx context.Context, id, userID string) error
}
