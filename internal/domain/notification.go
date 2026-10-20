package domain

import (
	"context"
	"time"
)

type Notification struct {
	ID          string     `json:"id"`
	BillID      string     `json:"bill_id"`
	Actor       string     `json:"actor"`
	Title       string     `json:"title"`
	Amount      float64    `json:"amount"`
	ReadAt      *time.Time `json:"read_at"`
	CreatedAt   time.Time  `json:"created_at"`
	EmailStatus string     `json:"email_status"`
}
type Debt struct {
	BillID    string  `json:"bill_id"`
	Title     string  `json:"title"`
	PersonID  string  `json:"person_id"`
	UserID    *string `json:"user_id"`
	Name      string  `json:"name"`
	Direction string  `json:"direction"`
	Amount    float64 `json:"amount"`
}
type Settlement struct {
	CounterpartyID *string `json:"counterparty_id,omitempty"`
	Counterparty   string  `json:"counterparty"`
	Direction      string  `json:"direction"`
	Amount         float64 `json:"amount"`
}
type NotificationRepository interface {
	List(context.Context, string, int) ([]Notification, error)
	Read(context.Context, string, string) error
	Debts(context.Context, string) ([]Debt, error)
	Settlements(context.Context, string) ([]Settlement, error)
}
