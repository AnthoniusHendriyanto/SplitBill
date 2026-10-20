package domain

import "context"

type InvitationRepository interface {
	Create(ctx context.Context, inv *Invitation) error
	GetByID(ctx context.Context, id string) (Invitation, error)
	GetByUser(ctx context.Context, userID string) ([]Invitation, error)
	GetByEmail(ctx context.Context, email string) ([]Invitation, error)
	UpdateStatus(ctx context.Context, id, status, toUserID string) error
}
