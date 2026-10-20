package middleware

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/user/split-mate/internal/domain"
	"github.com/user/split-mate/internal/usecase"
)

type contextKey string

const (
	ContextUserID contextKey = "user_id"
)

type AuthMiddleware struct {
	authUsecase usecase.AuthUsecase
}

func NewAuthMiddleware(authUsecase usecase.AuthUsecase) *AuthMiddleware {
	return &AuthMiddleware{authUsecase: authUsecase}
}

func (m *AuthMiddleware) Authenticate(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(domain.NewError("TOKEN_MISSING", "Missing authorization header", nil))
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(domain.NewError("TOKEN_INVALID", "Invalid authorization header format", nil))
			return
		}

		userID, err := m.authUsecase.ValidateToken(parts[1])
		if err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			code, message := "TOKEN_INVALID", "Invalid token"
			if errors.Is(err, domain.ErrTokenExpired) {
				code, message = "TOKEN_EXPIRED", "Access token expired"
			}
			json.NewEncoder(w).Encode(domain.NewError(code, message, nil))
			return
		}

		ctx := context.WithValue(r.Context(), ContextUserID, userID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func GetUserID(ctx context.Context) string {
	userID, ok := ctx.Value(ContextUserID).(string)
	if !ok {
		return ""
	}
	return userID
}
