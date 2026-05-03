package usecase

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/user/split-mate/internal/domain"
)

type billUsecase struct {
	billRepo       domain.BillRepository
	contextTimeout time.Duration
}

func NewBillUsecase(br domain.BillRepository, timeout time.Duration) domain.BillUsecase {
	return &billUsecase{
		billRepo:       br,
		contextTimeout: timeout,
	}
}

func (bu *billUsecase) Fetch(c context.Context) ([]domain.Bill, error) {
	ctx, cancel := context.WithTimeout(c, bu.contextTimeout)
	defer cancel()

	return bu.billRepo.Fetch(ctx)
}

func (bu *billUsecase) GetByID(c context.Context, id string) (domain.Bill, error) {
	ctx, cancel := context.WithTimeout(c, bu.contextTimeout)
	defer cancel()

	return bu.billRepo.GetByID(ctx, id)
}

func (bu *billUsecase) Store(c context.Context, b *domain.Bill) error {
	ctx, cancel := context.WithTimeout(c, bu.contextTimeout)
	defer cancel()

	if b.ID == "" {
		b.ID = uuid.New().String()
	}
	b.CreatedAt = time.Now()
	b.UpdatedAt = time.Now()

	return bu.billRepo.Store(ctx, b)
}
