package domain

import "context"

type BillRepository interface {
	Create(ctx context.Context, bill *Bill) error
	GetByID(ctx context.Context, id string) (Bill, error)
	GetByUserID(ctx context.Context, userID string, page, limit int, fromDate, toDate string) ([]Bill, int, error)
	Update(ctx context.Context, bill *Bill) error
	Delete(ctx context.Context, id string) error
	GetByUserIDAndID(ctx context.Context, userID, billID string) (Bill, error)
	CreateFull(ctx context.Context, bill *Bill, items []Item, persons []Person, assignments []ItemAssignment) error
	CreatePayments(ctx context.Context, billID string, payments []Payment) error
}

type ItemRepository interface {
	Create(ctx context.Context, item *Item) error
	GetByBillID(ctx context.Context, billID string) ([]Item, error)
	Update(ctx context.Context, item *Item) error
	Delete(ctx context.Context, id string) error
	DeleteByBillID(ctx context.Context, billID string) error
}

type PersonRepository interface {
	Create(ctx context.Context, person *Person) error
	GetByBillID(ctx context.Context, billID string) ([]Person, error)
	Update(ctx context.Context, person *Person) error
	Delete(ctx context.Context, id string) error
	DeleteByBillID(ctx context.Context, billID string) error
}

type AssignmentRepository interface {
	Create(ctx context.Context, assignment *ItemAssignment) error
	GetByBillID(ctx context.Context, billID string) ([]ItemAssignment, error)
	DeleteByBillID(ctx context.Context, billID string) error
}

type PaymentRepository interface {
	Create(ctx context.Context, payment *Payment) error
	GetByBillID(ctx context.Context, billID string) ([]Payment, error)
	Update(ctx context.Context, payment *Payment) error
	DeleteByBillID(ctx context.Context, billID string) error
}