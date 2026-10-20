package usecase

import (
	"context"

	"github.com/user/split-mate/internal/domain"
)

type contactUsecase struct {
	contactRepo domain.ContactRepository
}

func NewContactUsecase(repo domain.ContactRepository) ContactUsecase {
	return &contactUsecase{contactRepo: repo}
}

func (uc *contactUsecase) List(ctx context.Context, userID string) ([]domain.Contact, error) {
	contacts, err := uc.contactRepo.GetByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if contacts == nil {
		return []domain.Contact{}, nil
	}
	return contacts, nil
}

func (uc *contactUsecase) Create(ctx context.Context, userID, name string) (*domain.Contact, error) {
	contact := &domain.Contact{Name: name, UserID: userID}
	if err := uc.contactRepo.Create(ctx, contact); err != nil {
		return nil, err
	}
	return contact, nil
}

func (uc *contactUsecase) Delete(ctx context.Context, id, userID string) error {
	return uc.contactRepo.Delete(ctx, id, userID)
}
