package http

import (
	"net/http"

	"github.com/user/split-mate/internal/delivery/http/middleware"
	"github.com/user/split-mate/internal/usecase"
)

type UsageHandler struct {
	billUsecase usecase.BillUsecase
}

func NewUsageHandler(bu usecase.BillUsecase) *UsageHandler {
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
