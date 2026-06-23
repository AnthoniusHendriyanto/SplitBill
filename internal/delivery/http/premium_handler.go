package http

import (
	"encoding/json"
	"net/http"

	"github.com/user/split-mate/internal/delivery/http/middleware"
	"github.com/user/split-mate/internal/domain"
	"github.com/user/split-mate/internal/usecase"
)

type PremiumHandler struct {
	premiumUsecase usecase.PremiumUsecase
}

func NewPremiumHandler(pu usecase.PremiumUsecase) *PremiumHandler {
	return &PremiumHandler{premiumUsecase: pu}
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
