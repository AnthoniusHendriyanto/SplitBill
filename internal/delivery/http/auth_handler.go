package http

import (
	"encoding/json"
	"net/http"

	"github.com/user/split-mate/internal/delivery/http/middleware"
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
		writeError(w, http.StatusBadRequest, "INVALID_INPUT", "Invalid request body")
		return
	}

	if err := validate.Struct(req); err != nil {
		writeValidationError(w, err)
		return
	}

	resp, err := h.authUsecase.Register(r.Context(), &req)
	if err != nil {
		if err == domain.ErrAlreadyExists {
			writeError(w, http.StatusConflict, "REGISTRATION_FAILED", "Registration failed")
			return
		}
		writeInternalError(w, err)
		return
	}

	writeSuccess(w, http.StatusCreated, resp)
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req domain.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_INPUT", "Invalid request body")
		return
	}

	if err := validate.Struct(req); err != nil {
		writeValidationError(w, err)
		return
	}

	resp, err := h.authUsecase.Login(r.Context(), &req)
	if err != nil {
		if err == domain.ErrInvalidCredentials {
			writeError(w, http.StatusUnauthorized, "INVALID_CREDENTIALS", "Email or password is incorrect")
			return
		}
		writeInternalError(w, err)
		return
	}

	writeSuccess(w, http.StatusOK, resp)
}

func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	var req domain.RefreshRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_INPUT", "Invalid request body")
		return
	}

	if err := validate.Struct(req); err != nil {
		writeValidationError(w, err)
		return
	}

	resp, err := h.authUsecase.RefreshToken(r.Context(), req.RefreshToken)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "TOKEN_EXPIRED", "Invalid or expired refresh token")
		return
	}

	writeSuccess(w, http.StatusOK, resp)
}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	var req domain.RefreshRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_INPUT", "Invalid request body")
		return
	}

	if err := h.authUsecase.Logout(r.Context(), req.RefreshToken); err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to logout")
		return
	}

	writeSuccess(w, http.StatusNoContent, nil)
}

func (h *AuthHandler) GetMe(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Not authenticated")
		return
	}

	resp, err := h.authUsecase.GetMe(r.Context(), userID)
	if err != nil {
		writeInternalError(w, err)
		return
	}

	writeSuccess(w, http.StatusOK, resp)
}

func (h *AuthHandler) UpdateMe(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Not authenticated")
		return
	}

	var req domain.UpdateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_INPUT", "Invalid request body")
		return
	}

	if err := validate.Struct(req); err != nil {
		writeValidationError(w, err)
		return
	}

	resp, err := h.authUsecase.UpdateMe(r.Context(), userID, &req)
	if err != nil {
		writeInternalError(w, err)
		return
	}

	writeSuccess(w, http.StatusOK, resp)
}
