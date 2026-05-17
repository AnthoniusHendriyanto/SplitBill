package domain

import "time"

type User struct {
	ID                  string    `json:"id"`
	Email               string    `json:"email"`
	PasswordHash        string    `json:"-"`
	Name                string    `json:"name"`
	Tier                string    `json:"tier"`
	PaymentCustomerID    string    `json:"-"`
	PaymentSubscriptionID string    `json:"-"`
	PremiumExpiresAt    *time.Time `json:"-"`
	CreatedAt           time.Time `json:"created_at"`
	UpdatedAt           time.Time `json:"updated_at"`
}

type UserResponse struct {
	ID        string    `json:"id"`
	Email     string    `json:"email"`
	Name      string    `json:"name"`
	Tier      string    `json:"tier"`
	CreatedAt time.Time `json:"created_at"`
}

type RegisterRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=8"`
	Name     string `json:"name" validate:"required,min=1"`
}

type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

type AuthResponse struct {
	User         UserResponse `json:"user"`
	AccessToken  string       `json:"access_token"`
	RefreshToken string       `json:"refresh_token"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" validate:"required"`
}

type UpdateUserRequest struct {
	Name     string `json:"name"`
	Password string `json:"password"`
}