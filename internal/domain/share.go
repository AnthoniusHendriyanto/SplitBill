package domain

import (
	"context"
	"time"
)

type ShareLink struct {
	Token     string    `json:"token"`
	BillID    string    `json:"bill_id"`
	ExpiresAt time.Time `json:"expires_at"`
}

type PublicBill struct {
	ID         string         `json:"id"`
	Title      string         `json:"title"`
	Merchant   string         `json:"merchant,omitempty"`
	BillDate   string         `json:"bill_date"`
	GrandTotal float64        `json:"grand_total"`
	Status     string         `json:"status"`
	Items      []PublicItem   `json:"items"`
	Persons    []PublicPerson `json:"persons"`
	PayerName  string         `json:"payer_name"`
}

type PublicPerson struct {
	Name        string  `json:"name"`
	ShareAmount float64 `json:"share_amount"`
	IsPayer     bool    `json:"is_payer"`
}

type PublicItem struct {
	Name     string  `json:"name"`
	Price    float64 `json:"price"`
	Quantity int     `json:"quantity"`
}

type ShareRepository interface {
	Create(ctx context.Context, billID, userID, tokenHash string, expiresAt time.Time) error
	GetByTokenHash(ctx context.Context, tokenHash string) (string, error)
	RevokeByBillID(ctx context.Context, billID, userID string) error
}
