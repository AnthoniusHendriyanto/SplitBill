package domain

import "context"

type AuthUsecase interface {
	Register(ctx context.Context, req *RegisterRequest) (*AuthResponse, error)
	Login(ctx context.Context, req *LoginRequest) (*AuthResponse, error)
	RefreshToken(ctx context.Context, refreshToken string) (*AuthResponse, error)
	Logout(ctx context.Context, refreshToken string) error
	GetMe(ctx context.Context, userID string) (*UserResponse, error)
	UpdateMe(ctx context.Context, userID string, req *UpdateUserRequest) (*UserResponse, error)
	ValidateToken(tokenString string) (string, error)
}