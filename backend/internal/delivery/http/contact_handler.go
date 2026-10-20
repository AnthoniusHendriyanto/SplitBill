package http

import (
	"encoding/json"
	"net/http"

	"github.com/gorilla/mux"
	"github.com/user/split-mate/internal/delivery/http/middleware"
	"github.com/user/split-mate/internal/usecase"
)

type ContactHandler struct {
	contactUsecase usecase.ContactUsecase
}

func NewContactHandler(uc usecase.ContactUsecase) *ContactHandler {
	return &ContactHandler{contactUsecase: uc}
}

func (h *ContactHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Not authenticated")
		return
	}

	contacts, err := h.contactUsecase.List(r.Context(), userID)
	if err != nil {
		writeInternalError(w, err)
		return
	}
	writeSuccess(w, http.StatusOK, contacts)
}

func (h *ContactHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Not authenticated")
		return
	}

	var req struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_INPUT", "Invalid request body")
		return
	}
	if req.Name == "" {
		writeError(w, http.StatusBadRequest, "MISSING_NAME", "Name is required")
		return
	}

	contact, err := h.contactUsecase.Create(r.Context(), userID, req.Name)
	if err != nil {
		writeInternalError(w, err)
		return
	}

	writeSuccess(w, http.StatusCreated, contact)
}

func (h *ContactHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Not authenticated")
		return
	}

	id := mux.Vars(r)["id"]
	if id == "" {
		writeError(w, http.StatusBadRequest, "MISSING_ID", "Contact ID is required")
		return
	}

	if err := h.contactUsecase.Delete(r.Context(), id, userID); err != nil {
		writeInternalError(w, err)
		return
	}

	writeSuccess(w, http.StatusOK, map[string]string{"status": "deleted"})
}
