package http

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/user/split-mate/internal/delivery/http/middleware"
	"errors"

	"github.com/user/split-mate/internal/domain"
	"github.com/user/split-mate/internal/usecase"
)

const refreshTokenCookieName = "refresh_token"

func setRefreshCookie(w http.ResponseWriter, token string, maxAge int) {
	http.SetCookie(w, &http.Cookie{
		Name:     refreshTokenCookieName,
		Value:    token,
		Path:     "/api/v1/auth",
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteStrictMode,
		MaxAge:   maxAge,
	})
}

func clearRefreshCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     refreshTokenCookieName,
		Value:    "",
		Path:     "/api/v1/auth",
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteStrictMode,
		MaxAge:   -1,
		Expires:  time.Unix(0, 0),
	})
}

func readRefreshCookie(r *http.Request) string {
	c, err := r.Cookie(refreshTokenCookieName)
	if err != nil {
		return ""
	}
	return c.Value
}

type AuthHandler struct {
	authUsecase usecase.AuthUsecase
}

func NewAuthHandler(authUsecase usecase.AuthUsecase) *AuthHandler {
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
		if errors.Is(err, domain.ErrAlreadyExists) {
			writeError(w, http.StatusConflict, "REGISTRATION_FAILED", "Registration failed")
			return
		}
		writeInternalError(w, err)
		return
	}

	setRefreshCookie(w, resp.RefreshToken, 7*24*3600)
	resp.RefreshToken = ""
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
		if errors.Is(err, domain.ErrInvalidCredentials) {
			writeError(w, http.StatusUnauthorized, "INVALID_CREDENTIALS", "Email or password is incorrect")
			return
		}
		writeInternalError(w, err)
		return
	}

	setRefreshCookie(w, resp.RefreshToken, 7*24*3600)
	resp.RefreshToken = ""
	writeSuccess(w, http.StatusOK, resp)
}

func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	refreshToken := readRefreshCookie(r)
	if refreshToken == "" {
		writeError(w, http.StatusUnauthorized, "TOKEN_EXPIRED", "No refresh token")
		return
	}

	resp, err := h.authUsecase.RefreshToken(r.Context(), refreshToken)
	if err != nil {
		clearRefreshCookie(w)
		writeError(w, http.StatusUnauthorized, "TOKEN_EXPIRED", "Invalid or expired refresh token")
		return
	}

	setRefreshCookie(w, resp.RefreshToken, 7*24*3600)
	resp.RefreshToken = ""
	writeSuccess(w, http.StatusOK, resp)
}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	refreshToken := readRefreshCookie(r)
	if refreshToken != "" {
		if err := h.authUsecase.Logout(r.Context(), refreshToken); err != nil {
			writeInternalError(w, err)
			return
		}
	}

	clearRefreshCookie(w)
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
