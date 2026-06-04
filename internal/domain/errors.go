package domain

import "errors"

var (
	ErrNotFound              = errors.New("resource not found")
	ErrAlreadyExists        = errors.New("resource already exists")
	ErrInvalidCredentials   = errors.New("invalid credentials")
	ErrUnauthorized         = errors.New("unauthorized")
	ErrTokenExpired         = errors.New("token expired")
	ErrTokenInvalid         = errors.New("invalid token")
	ErrForbidden            = errors.New("forbidden")
	ErrPremiumRequired      = errors.New("custom and percentage split are premium features")
	ErrInvalidInput         = errors.New("invalid input")
	ErrInternalError        = errors.New("internal error")
)

type ValidationError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

type ErrorResponse struct {
	Code    string            `json:"code"`
	Message string            `json:"message"`
	Details []ValidationError `json:"details,omitempty"`
}

func NewErrorResponse(code, message string) ErrorResponse {
	return ErrorResponse{
		Code:    code,
		Message: message,
	}
}