package http

import (
	"context"
	"encoding/json"
	"net/http"
	"github.com/user/split-mate/internal/domain"
)

type ResponseError struct {
	Message string `json:"message"`
}

type BillHandler struct {
	BillUsecase domain.BillUsecase
}

func NewBillHandler(bu domain.BillUsecase) *BillHandler {
	return &BillHandler{
		BillUsecase: bu,
	}
}

func (h *BillHandler) Fetch(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	bills, err := h.BillUsecase.Fetch(ctx)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(ResponseError{Message: err.Error()})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(bills)
}

func (h *BillHandler) Store(w http.ResponseWriter, r *http.Request) {
	var bill domain.Bill
	err := json.NewDecoder(r.Body).Decode(&bill)
	if err != nil {
		w.WriteHeader(http.StatusUnprocessableEntity)
		json.NewEncoder(w).Encode(ResponseError{Message: err.Error()})
		return
	}

	ctx := context.Background()
	err = h.BillUsecase.Store(ctx, &bill)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(ResponseError{Message: err.Error()})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(bill)
}
