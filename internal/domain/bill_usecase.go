package domain

import "context"

type BillUsecase interface {
	Fetch(ctx context.Context) ([]Bill, error)
	GetByID(ctx context.Context, id string) (Bill, error)
	Store(ctx context.Context, b *Bill) error
}
