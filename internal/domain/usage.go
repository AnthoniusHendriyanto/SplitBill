package domain

import "time"

type UsageTracking struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	Action    string    `json:"action"`
	Count     int       `json:"count"`
	Month     string    `json:"month"`
	CreatedAt time.Time `json:"created_at"`
}

type UsageResponse struct {
	Current  int        `json:"current"`
	Limit    int        `json:"limit"`
	ResetAt  time.Time  `json:"reset_at"`
}

type UsageLimit struct {
	Current int   `json:"current"`
	Limit   int   `json:"limit"`
}