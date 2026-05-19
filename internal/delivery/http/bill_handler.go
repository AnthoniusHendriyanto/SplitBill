package http

import (
	"encoding/json"
	"io"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
	"github.com/user/split-mate/internal/delivery/http/middleware"
	"github.com/user/split-mate/internal/domain"
)

type BillHandler struct {
	BillUsecase domain.BillUsecase
}

func NewBillHandler(bu domain.BillUsecase) *BillHandler {
	return &BillHandler{BillUsecase: bu}
}

func (h *BillHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req domain.CreateBillRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(domain.ErrorResponse{
			Code:    "INVALID_INPUT",
			Message: "Invalid request body",
		})
		return
	}

	bill, err := h.BillUsecase.Create(r.Context(), userID, &req)
	if err != nil {
		if err.Error() == "custom and percentage split are premium features" {
			w.WriteHeader(http.StatusForbidden)
			json.NewEncoder(w).Encode(domain.ErrorResponse{
				Code:    "PREMIUM_REQUIRED",
				Message: "Custom and percentage split are premium features",
			})
			return
		}
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(domain.ErrorResponse{
			Code:    "INTERNAL_ERROR",
			Message: err.Error(),
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(bill)
}

func (h *BillHandler) Fetch(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit < 1 {
		limit = 20
	}

	fromDate := r.URL.Query().Get("from_date")
	toDate := r.URL.Query().Get("to_date")

	resp, err := h.BillUsecase.Fetch(r.Context(), userID, page, limit, fromDate, toDate)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(domain.ErrorResponse{
			Code:    "INTERNAL_ERROR",
			Message: err.Error(),
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func (h *BillHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	billID := vars["id"]
	if billID == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(domain.ErrorResponse{
			Code:    "MISSING_ID",
			Message: "Bill ID is required",
		})
		return
	}

	resp, err := h.BillUsecase.GetByID(r.Context(), userID, billID)
	if err != nil {
		if err == domain.ErrNotFound {
			w.WriteHeader(http.StatusNotFound)
			json.NewEncoder(w).Encode(domain.ErrorResponse{
				Code:    "BILL_NOT_FOUND",
				Message: "Bill not found",
			})
			return
		}
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(domain.ErrorResponse{
			Code:    "INTERNAL_ERROR",
			Message: err.Error(),
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func (h *BillHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	billID := vars["id"]
	if billID == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(domain.ErrorResponse{
			Code:    "MISSING_ID",
			Message: "Bill ID is required",
		})
		return
	}

	err := h.BillUsecase.Delete(r.Context(), userID, billID)
	if err != nil {
		if err == domain.ErrNotFound {
			w.WriteHeader(http.StatusNotFound)
			json.NewEncoder(w).Encode(domain.ErrorResponse{
				Code:    "BILL_NOT_FOUND",
				Message: "Bill not found",
			})
			return
		}
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(domain.ErrorResponse{
			Code:    "INTERNAL_ERROR",
			Message: err.Error(),
		})
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *BillHandler) ProcessOCR(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	// OCR works without auth (returns results), but usage tracking only for authenticated users

	file, _, err := r.FormFile("image")
	if err != nil {
		file, _, err = r.FormFile("receipt")
	}
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(domain.ErrorResponse{
			Code:    "INVALID_FILE",
			Message: "Image file is required (field: image or receipt)",
		})
		return
	}
	defer file.Close()

	imageBytes, err := io.ReadAll(file)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(domain.ErrorResponse{
			Code:    "FILE_READ_ERROR",
			Message: "Failed to read image file",
		})
		return
	}

	result, err := h.BillUsecase.ProcessOCR(r.Context(), userID, imageBytes)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(domain.ErrorResponse{
			Code:    "OCR_ERROR",
			Message: err.Error(),
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}