package middleware

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/user/split-mate/internal/domain"
)

type contextKey string

const (
	ContextUserID contextKey = "user_id"
)

type AuthMiddleware struct {
	authUsecase domain.AuthUsecase
}

func NewAuthMiddleware(authUsecase domain.AuthUsecase) *AuthMiddleware {
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
			json.NewEncoder(w).Encode(domain.NewError("TOKEN_EXPIRED", "Invalid or expired token", nil))
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
