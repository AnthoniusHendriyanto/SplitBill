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

type GroupHandler struct{ Usecase usecase.GroupUsecase }

func NewGroupHandler(uc usecase.GroupUsecase) *GroupHandler { return &GroupHandler{Usecase: uc} }

func (h *GroupHandler) List(w http.ResponseWriter, r *http.Request) {
	groups, err := h.Usecase.List(r.Context(), middleware.GetUserID(r.Context()))
	if err != nil {
		writeInternalError(w, err)
		return
	}
	writeSuccess(w, http.StatusOK, groups)
}

func (h *GroupHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req domain.CreateGroupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_INPUT", "Invalid request body")
		return
	}
	if err := validate.Struct(req); err != nil {
		writeValidationError(w, err)
		return
	}
	group, err := h.Usecase.Create(r.Context(), middleware.GetUserID(r.Context()), &req)
	if err != nil {
		writeInternalError(w, err)
		return
	}
	writeSuccess(w, http.StatusCreated, group)
}

func (h *GroupHandler) Detail(w http.ResponseWriter, r *http.Request) {
	detail, err := h.Usecase.GetDetail(r.Context(), middleware.GetUserID(r.Context()), mux.Vars(r)["id"])
	if errors.Is(err, domain.ErrNotFound) {
		writeError(w, http.StatusNotFound, "GROUP_NOT_FOUND", "Group not found")
		return
	}
	if err != nil {
		writeInternalError(w, err)
		return
	}
	writeSuccess(w, http.StatusOK, detail)
}

func (h *GroupHandler) Delete(w http.ResponseWriter, r *http.Request) {
	err := h.Usecase.Delete(r.Context(), middleware.GetUserID(r.Context()), mux.Vars(r)["id"])
	if errors.Is(err, domain.ErrNotFound) {
		writeError(w, http.StatusNotFound, "GROUP_NOT_FOUND", "Group not found")
		return
	}
	if err != nil {
		writeInternalError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *GroupHandler) AddMember(w http.ResponseWriter, r *http.Request) {
	var req domain.AddGroupMemberRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_INPUT", "Invalid request body")
		return
	}
	if err := validate.Struct(req); err != nil {
		writeValidationError(w, err)
		return
	}
	member, err := h.Usecase.AddMember(r.Context(), middleware.GetUserID(r.Context()), mux.Vars(r)["id"], &req)
	if errors.Is(err, domain.ErrNotFound) {
		writeError(w, http.StatusNotFound, "GROUP_NOT_FOUND", "Group not found")
		return
	}
	if err != nil {
		writeInternalError(w, err)
		return
	}
	writeSuccess(w, http.StatusCreated, member)
}

func (h *GroupHandler) RemoveMember(w http.ResponseWriter, r *http.Request) {
	err := h.Usecase.RemoveMember(r.Context(), middleware.GetUserID(r.Context()), mux.Vars(r)["id"], mux.Vars(r)["memberId"])
	if errors.Is(err, domain.ErrNotFound) {
		writeError(w, http.StatusNotFound, "MEMBER_NOT_FOUND", "Group member not found")
		return
	}
	if err != nil {
		writeInternalError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *GroupHandler) AttachBill(w http.ResponseWriter, r *http.Request) {
	var req domain.AttachBillRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_INPUT", "Invalid request body")
		return
	}
	err := h.Usecase.AttachBill(r.Context(), middleware.GetUserID(r.Context()), mux.Vars(r)["id"], mux.Vars(r)["billId"], &req)
	if errors.Is(err, domain.ErrNotFound) {
		writeError(w, http.StatusNotFound, "RESOURCE_NOT_FOUND", "Group or bill not found")
		return
	}
	if err != nil {
		writeInternalError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *GroupHandler) DefaultSplit(w http.ResponseWriter, r *http.Request) {
	groupID := mux.Vars(r)["id"]
	userID := middleware.GetUserID(r.Context())
	if r.Method == http.MethodGet {
		item, err := h.Usecase.GetDefaultSplit(r.Context(), userID, groupID)
		if errors.Is(err, domain.ErrNotFound) {
			writeError(w, http.StatusNotFound, "DEFAULT_SPLIT_NOT_FOUND", "Default split not configured")
			return
		}
		if err != nil {
			writeInternalError(w, err)
			return
		}
		writeSuccess(w, http.StatusOK, item)
		return
	}
	var split domain.GroupDefaultSplit
	if err := json.NewDecoder(r.Body).Decode(&split); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_INPUT", "Invalid request body")
		return
	}
	split.GroupID = groupID
	if err := h.Usecase.SetDefaultSplit(r.Context(), userID, groupID, &split); err != nil {
		if errors.Is(err, domain.ErrInvalidInput) {
			writeError(w, http.StatusBadRequest, "INVALID_INPUT", "Invalid split type")
			return
		}
		if errors.Is(err, domain.ErrNotFound) {
			writeError(w, http.StatusNotFound, "GROUP_NOT_FOUND", "Group not found")
			return
		}
		writeInternalError(w, err)
		return
	}
	writeSuccess(w, http.StatusOK, split)
}
