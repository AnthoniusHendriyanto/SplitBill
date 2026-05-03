package domain

import "context"

type BillRepository interface {
	Fetch(ctx context.Context) ([]Bill, error)
	GetByID(ctx context.Context, id string) (Bill, error)
	Store(ctx context.Context, b *Bill) error
}
