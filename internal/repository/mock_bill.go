package repository

import (
	"context"
	"errors"
	"sync"
	"github.com/user/split-mate/internal/domain"
)

type mockBillRepository struct {
	mu    sync.RWMutex
	bills map[string]domain.Bill
}

func NewMockBillRepository() domain.BillRepository {
	return &mockBillRepository{
		bills: make(map[string]domain.Bill),
	}
}

func (m *mockBillRepository) Fetch(ctx context.Context) ([]domain.Bill, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	
	res := make([]domain.Bill, 0, len(m.bills))
	for _, b := range m.bills {
		res = append(res, b)
	}
	return res, nil
}

func (m *mockBillRepository) GetByID(ctx context.Context, id string) (domain.Bill, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	
	b, ok := m.bills[id]
	if !ok {
		return domain.Bill{}, errors.New("bill not found")
	}
	return b, nil
}

func (m *mockBillRepository) Store(ctx context.Context, b *domain.Bill) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	
	m.bills[b.ID] = *b
	return nil
}
