package http

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/user/split-mate/internal/delivery/http/middleware"
	"github.com/user/split-mate/internal/domain"
	"github.com/user/split-mate/internal/usecase"
)

type PremiumHandler struct {
	premiumUsecase      usecase.PremiumUsecase
	callbackSecret      string
}

func NewPremiumHandler(pu usecase.PremiumUsecase, callbackSecret string) *PremiumHandler {
	return &PremiumHandler{premiumUsecase: pu, callbackSecret: callbackSecret}
}

func (h *PremiumHandler) Subscribe(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Not authenticated")
		return
	}

	var req domain.PremiumSubscribeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_INPUT", "Invalid request body")
		return
	}

	resp, err := h.premiumUsecase.Subscribe(r.Context(), userID, &req)
	if err != nil {
		writeInternalError(w, err)
		return
	}

	writeSuccess(w, http.StatusOK, resp)
}

func (h *PremiumHandler) Callback(w http.ResponseWriter, r *http.Request) {
	if h.callbackSecret != "" && r.Header.Get("X-Callback-Secret") != h.callbackSecret {
		log.Printf("Premium callback rejected: missing or invalid X-Callback-Secret")
		writeError(w, http.StatusForbidden, "FORBIDDEN", "Invalid callback secret")
		return
	}

	var req domain.PremiumCallbackRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_INPUT", "Invalid request body")
		return
	}

	if err := h.premiumUsecase.ConfirmPayment(r.Context(), &req); err != nil {
		writeInternalError(w, err)
		return
	}

	writeSuccess(w, http.StatusOK, map[string]string{"status": "premium_active"})
}
