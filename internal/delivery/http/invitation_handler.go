package http

import (
	"encoding/json"
	"net/http"

	"github.com/gorilla/mux"
	"github.com/user/split-mate/internal/delivery/http/middleware"
	"github.com/user/split-mate/internal/usecase"
)

type InvitationHandler struct {
	invitationUsecase usecase.InvitationUsecase
}

func NewInvitationHandler(uc usecase.InvitationUsecase) *InvitationHandler {
	return &InvitationHandler{invitationUsecase: uc}
}

func (h *InvitationHandler) Send(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Not authenticated")
		return
	}

	var req struct {
		Email string `json:"email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_INPUT", "Invalid request body")
		return
	}
	if req.Email == "" {
		writeError(w, http.StatusBadRequest, "MISSING_EMAIL", "Email is required")
		return
	}

	inv, err := h.invitationUsecase.Send(r.Context(), userID, req.Email)
	if err != nil {
		writeInternalError(w, err)
		return
	}
	writeSuccess(w, http.StatusCreated, inv)
}

func (h *InvitationHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Not authenticated")
		return
	}

	invs, err := h.invitationUsecase.List(r.Context(), userID)
	if err != nil {
		writeInternalError(w, err)
		return
	}
	writeSuccess(w, http.StatusOK, invs)
}

func (h *InvitationHandler) Accept(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Not authenticated")
		return
	}

	invID := mux.Vars(r)["id"]
	if invID == "" {
		writeError(w, http.StatusBadRequest, "MISSING_ID", "Invitation ID is required")
		return
	}

	if err := h.invitationUsecase.Accept(r.Context(), userID, invID); err != nil {
		if err.Error() == "invitation is not pending" {
			writeError(w, http.StatusConflict, "INVITATION_NOT_PENDING", err.Error())
			return
		}
		if err.Error() == "this invitation was sent to a different email" {
			writeError(w, http.StatusForbidden, "EMAIL_MISMATCH", err.Error())
			return
		}
		writeInternalError(w, err)
		return
	}
	writeSuccess(w, http.StatusOK, map[string]string{"status": "accepted"})
}

func (h *InvitationHandler) Reject(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Not authenticated")
		return
	}

	invID := mux.Vars(r)["id"]
	if invID == "" {
		writeError(w, http.StatusBadRequest, "MISSING_ID", "Invitation ID is required")
		return
	}

	if err := h.invitationUsecase.Reject(r.Context(), userID, invID); err != nil {
		if err.Error() == "invitation is not pending" {
			writeError(w, http.StatusConflict, "INVITATION_NOT_PENDING", err.Error())
			return
		}
		writeInternalError(w, err)
		return
	}
	writeSuccess(w, http.StatusOK, map[string]string{"status": "rejected"})
}
