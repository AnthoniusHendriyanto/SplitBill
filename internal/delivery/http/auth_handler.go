package http

import (
	"encoding/json"
	"net/http"

	"github.com/user/split-mate/internal/domain"
)

type AuthHandler struct {
	authUsecase domain.AuthUsecase
}

func NewAuthHandler(authUsecase domain.AuthUsecase) *AuthHandler {
	return &AuthHandler{authUsecase: authUsecase}
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req domain.RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(domain.ErrorResponse{
			Code:    "INVALID_INPUT",
			Message: "Invalid request body",
		})
		return
	}

	resp, err := h.authUsecase.Register(r.Context(), &req)
	if err != nil {
		if err == domain.ErrAlreadyExists {
			w.WriteHeader(http.StatusConflict)
			json.NewEncoder(w).Encode(domain.ErrorResponse{
				Code:    "USER_ALREADY_EXISTS",
				Message: "Email already registered",
			})
			return
		}
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(domain.ErrorResponse{
			Code:    "INTERNAL_ERROR",
			Message: err.Error(),
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(resp)
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req domain.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(domain.ErrorResponse{
			Code:    "INVALID_INPUT",
			Message: "Invalid request body",
		})
		return
	}

	resp, err := h.authUsecase.Login(r.Context(), &req)
	if err != nil {
		if err == domain.ErrInvalidCredentials {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(domain.ErrorResponse{
				Code:    "INVALID_CREDENTIALS",
				Message: "Email or password is incorrect",
			})
			return
		}
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(domain.ErrorResponse{
			Code:    "INTERNAL_ERROR",
			Message: err.Error(),
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	var req domain.RefreshRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(domain.ErrorResponse{
			Code:    "INVALID_INPUT",
			Message: "Invalid request body",
		})
		return
	}

	resp, err := h.authUsecase.RefreshToken(r.Context(), req.RefreshToken)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(domain.ErrorResponse{
			Code:    "TOKEN_EXPIRED",
			Message: "Invalid or expired refresh token",
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}