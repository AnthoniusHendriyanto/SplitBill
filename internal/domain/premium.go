package domain

import "time"

type PremiumSubscribeRequest struct {
	PriceID string `json:"price_id"`
}

type PremiumSubscribeResponse struct {
	PaymentID    string `json:"payment_id"`
	Amount       int    `json:"amount"`
	BankName     string `json:"bank_name"`
	AccountNumber string `json:"account_number"`
	AccountName  string `json:"account_name"`
	Status       string `json:"status"`
	ExpiresAt    string `json:"expires_at"`
}

type PremiumCallbackRequest struct {
	PaymentID string `json:"payment_id"`
	UserID    string `json:"user_id"`
}

type PremiumRequest struct {
	ID         string     `json:"id"`
	UserID     string     `json:"user_id"`
	Status     string     `json:"status"`
	Amount     int        `json:"amount"`
	CreatedAt  time.Time  `json:"created_at"`
	ExpiresAt  *time.Time `json:"expires_at,omitempty"`
}
