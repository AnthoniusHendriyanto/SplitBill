package http

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http/httptest"
	"testing"

	"github.com/user/split-mate/internal/delivery/http/middleware"
	"github.com/user/split-mate/internal/domain"
	"github.com/user/split-mate/internal/usecase"
)

type captureCreate struct {
	usecase.BillUsecase
	request *domain.CreateBillRequest
}

func (c *captureCreate) Create(_ context.Context, _ string, req *domain.CreateBillRequest) (*domain.Bill, error) {
	c.request = req
	return &domain.Bill{ID: "saved"}, nil
}

func TestCreateWireContract(t *testing.T) {
	uc := &captureCreate{}
	h := NewBillHandler(uc)
	payload := map[string]interface{}{
		"title": "Lunch", "bill_date": "2026-10-18", "split_type": "custom",
		"request_key": "d53b4510-964e-4c79-b119-e3f3ae907e4a",
		"items":       []map[string]interface{}{{"id": "meal", "name": "Meal", "price": 100, "quantity": 1}},
		"persons": []map[string]interface{}{
			{"id": "a", "name": "Actor", "is_payer": true, "custom_amount": 40, "user_id": "203dd4c0-91b9-4b3f-8ae4-d37749df3f70"},
			{"id": "b", "name": "Friend", "custom_amount": 60},
		},
	}
	send := func() int {
		body, err := json.Marshal(payload)
		if err != nil {
			t.Fatal(err)
		}
		r := httptest.NewRequest("POST", "/api/v1/bills", bytes.NewReader(body))
		r = r.WithContext(context.WithValue(r.Context(), middleware.ContextUserID, "actor"))
		w := httptest.NewRecorder()
		h.Create(w, r)
		return w.Code
	}
	if status := send(); status != 201 {
		t.Fatalf("valid payload: %d", status)
	}
	if uc.request.Persons[1].CustomAmount != 60 || uc.request.Persons[0].UserID == "" {
		t.Fatal("lost identity/custom fields")
	}
	uc.request = nil
	delete(payload, "request_key")
	if status := send(); status != 400 || uc.request != nil {
		t.Fatalf("missing key admitted: %d", status)
	}
}
