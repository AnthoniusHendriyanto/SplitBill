package domain

import (
	"context"
	"time"
)

type Share struct {
	ID          string     `json:"id"`
	BillID      string     `json:"bill_id"`
	ShareToken  string     `json:"share_token"`
	ViewToken   string     `json:"view_token,omitempty"`
	AllowEdit   bool       `json:"allow_edit"`
	MaxViews    *int       `json:"max_views,omitempty"`
	CurrentViews int       `json:"current_views"`
	ExpiresAt   *time.Time `json:"expires_at,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
}

type ShareResponse struct {
	ShareToken string `json:"share_token"`
	ShareURL   string `json:"share_url"`
	AllowEdit  bool   `json:"allow_edit"`
	ExpiresAt  *time.Time `json:"expires_at,omitempty"`
}

type CreateShareRequest struct {
	AllowEdit  bool       `json:"allow_edit"`
	MaxViews   *int       `json:"max_views,omitempty"`
	ExpiresIn  *int       `json:"expires_in_hours,omitempty"`
}

type ShareRepository interface {
	Create(ctx context.Context, share *Share) error
	GetByShareToken(ctx context.Context, token string) (Share, error)
	IncrementViews(ctx context.Context, token string) error
	Delete(ctx context.Context, token string) error
}