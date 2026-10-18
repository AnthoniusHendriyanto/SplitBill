package domain

import "errors"

var (
	ErrNotFound           = errors.New("resource not found")
	ErrAlreadyExists      = errors.New("resource already exists")
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrTokenExpired       = errors.New("token expired")
	ErrTokenInvalid       = errors.New("invalid token")
	ErrPremiumRequired    = errors.New("custom and percentage split are premium features")
	ErrInvalidInput       = errors.New("invalid input")
	ErrBillLimitExceeded  = errors.New("monthly bill limit reached")
)

type ValidationError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}
