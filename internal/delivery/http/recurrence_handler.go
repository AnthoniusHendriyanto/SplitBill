package http

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/gorilla/mux"
	"github.com/user/split-mate/internal/delivery/http/middleware"
	"github.com/user/split-mate/internal/domain"
	"github.com/user/split-mate/internal/usecase"
)

type RecurrenceHandler struct{ Usecase usecase.RecurrenceUsecase }

func NewRecurrenceHandler(uc usecase.RecurrenceUsecase) *RecurrenceHandler {
	return &RecurrenceHandler{Usecase: uc}
}

func (h *RecurrenceHandler) List(w http.ResponseWriter, r *http.Request) {
	items, err := h.Usecase.List(r.Context(), middleware.GetUserID(r.Context()))
	if err != nil {
		writeInternalError(w, err)
		return
	}
	writeSuccess(w, http.StatusOK, items)
}

func (h *RecurrenceHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req domain.CreateRecurrenceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_INPUT", "Invalid request body")
		return
	}
	if err := validate.Struct(req); err != nil {
		writeValidationError(w, err)
		return
	}
	item, err := h.Usecase.Create(r.Context(), middleware.GetUserID(r.Context()), &req)
	if errors.Is(err, domain.ErrInvalidInput) {
		writeError(w, http.StatusBadRequest, "INVALID_INPUT", err.Error())
		return
	}
	if err != nil {
		writeInternalError(w, err)
		return
	}
	writeSuccess(w, http.StatusCreated, item)
}

func (h *RecurrenceHandler) SetStatus(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_INPUT", "Invalid request body")
		return
	}
	err := h.Usecase.SetStatus(r.Context(), middleware.GetUserID(r.Context()), mux.Vars(r)["id"], req.Status)
	if errors.Is(err, domain.ErrNotFound) {
		writeError(w, http.StatusNotFound, "RECURRENCE_NOT_FOUND", "Recurrence not found")
		return
	}
	if errors.Is(err, domain.ErrInvalidInput) {
		writeError(w, http.StatusBadRequest, "INVALID_INPUT", "Invalid recurrence status")
		return
	}
	if err != nil {
		writeInternalError(w, err)
		return
	}
	writeSuccess(w, http.StatusOK, map[string]string{"status": req.Status})
}
