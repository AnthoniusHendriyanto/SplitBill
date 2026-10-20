package http

import (
	"errors"
	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/user/split-mate/internal/delivery/http/middleware"
	"github.com/user/split-mate/internal/domain"
	"net/http"
	"strconv"
)

type NotificationHandler struct{ Repo domain.NotificationRepository }

func (h *NotificationHandler) List(w http.ResponseWriter, r *http.Request) {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	if page > 100000 {
		page = 100000
	}
	result, err := h.Repo.List(r.Context(), middleware.GetUserID(r.Context()), page)
	if err != nil {
		writeInternalError(w, err)
		return
	}
	writeSuccess(w, http.StatusOK, result)
}
func (h *NotificationHandler) Read(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	if _, err := uuid.Parse(id); err != nil {
		writeError(w, 400, "INVALID_INPUT", "Invalid notification ID")
		return
	}
	err := h.Repo.Read(r.Context(), middleware.GetUserID(r.Context()), id)
	if errors.Is(err, domain.ErrNotFound) {
		writeError(w, 404, "NOT_FOUND", "Notification not found")
		return
	}
	if err != nil {
		writeInternalError(w, err)
		return
	}
	writeSuccess(w, 200, map[string]bool{"read": true})
}
func (h *NotificationHandler) Debts(w http.ResponseWriter, r *http.Request) {
	result, err := h.Repo.Debts(r.Context(), middleware.GetUserID(r.Context()))
	if err != nil {
		writeInternalError(w, err)
		return
	}
	writeSuccess(w, 200, result)
}

func (h *NotificationHandler) Settlements(w http.ResponseWriter, r *http.Request) {
	items, err := h.Repo.Settlements(r.Context(), middleware.GetUserID(r.Context()))
	if err != nil {
		writeInternalError(w, err)
		return
	}
	writeSuccess(w, http.StatusOK, items)
}
