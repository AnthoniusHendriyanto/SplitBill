package domain

import (
	"context"
	"time"
)

type Recurrence struct {
	ID              string            `json:"id"`
	OwnerID         string            `json:"owner_id"`
	Cadence         string            `json:"cadence"`
	Interval        int               `json:"interval"`
	NextRun         string            `json:"next_run"`
	Status          string            `json:"status"`
	Template        CreateBillRequest `json:"template"`
	LastGeneratedOn string            `json:"last_generated_on,omitempty"`
	CreatedAt       time.Time         `json:"created_at"`
	UpdatedAt       time.Time         `json:"updated_at"`
}

type RecurrenceOccurrence struct {
	RecurrenceID string
	RunDate      string
	BillID       string
}

type CreateRecurrenceRequest struct {
	Cadence  string            `json:"cadence" validate:"required,oneof=weekly monthly yearly"`
	Interval int               `json:"interval" validate:"min=1,max=12"`
	NextRun  string            `json:"next_run" validate:"required"`
	Template CreateBillRequest `json:"template" validate:"required"`
}

type RecurrenceRepository interface {
	Create(ctx context.Context, recurrence *Recurrence) error
	ListByOwner(ctx context.Context, ownerID string) ([]Recurrence, error)
	GetByOwner(ctx context.Context, ownerID, id string) (*Recurrence, error)
	SetStatus(ctx context.Context, ownerID, id, status string) error
	ListDue(ctx context.Context, now string) ([]Recurrence, error)
	ClaimOccurrence(ctx context.Context, recurrenceID, runDate string) (bool, error)
	CompleteOccurrence(ctx context.Context, recurrenceID, runDate, billID, nextRun string) error
	ReleaseOccurrence(ctx context.Context, recurrenceID, runDate string) error
}
