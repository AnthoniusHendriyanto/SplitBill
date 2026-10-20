package usecase

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/user/split-mate/internal/domain"
)

type summaryBills struct{ domain.BillRepository }

func (summaryBills) GetByUserID(context.Context, string, int, int, string, string) ([]domain.Bill, int, error) {
	return []domain.Bill{{ID: "one"}, {ID: "two"}}, 2, nil
}

type summaryPayments struct{ domain.PaymentRepository }

func (summaryPayments) GetUserPaymentSummaryByBillIDs(context.Context, []string, string) (map[string]domain.UserPaymentSummary, error) {
	return map[string]domain.UserPaymentSummary{}, nil
}

type summaryPeople struct {
	domain.PersonRepository
	calls int
	err   error
}

func (p *summaryPeople) GetByBillIDs(_ context.Context, ids []string) (map[string][]domain.Person, error) {
	p.calls++
	if len(ids) != 2 {
		panic("participants were not batched")
	}
	return map[string][]domain.Person{"one": {{Name: "Payer", IsPayer: true}}}, p.err
}

func TestFetchBatchesPeopleAndPropagatesFailure(t *testing.T) {
	people := &summaryPeople{}
	uc := &billUsecase{billRepo: summaryBills{}, paymentRepo: summaryPayments{}, personRepo: people, contextTimeout: time.Second}
	result, err := uc.Fetch(context.Background(), "user", 1, 20, "", "")
	if err != nil || people.calls != 1 || result.Data[0].PayerName != "Payer" {
		t.Fatalf("result %v calls %d err %v", result, people.calls, err)
	}
	people.err = errors.New("participants unavailable")
	if _, err = uc.Fetch(context.Background(), "user", 1, 20, "", ""); !errors.Is(err, people.err) {
		t.Fatalf("swallowed failure: %v", err)
	}
}
