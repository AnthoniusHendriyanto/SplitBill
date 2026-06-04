package http

import (
	"net/http"

	"github.com/user/split-mate/internal/delivery/http/middleware"
	"github.com/user/split-mate/internal/domain"
)

type UsageHandler struct {
	billUsecase domain.BillUsecase
}

func NewUsageHandler(bu domain.BillUsecase) *UsageHandler {
	return &UsageHandler{billUsecase: bu}
}

func (h *UsageHandler) GetUsage(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Not authenticated")
		return
	}

	resp, err := h.billUsecase.GetUsage(r.Context(), userID)
	if err != nil {
		writeInternalError(w, err)
		return
	}

	writeSuccess(w, http.StatusOK, resp)
}
