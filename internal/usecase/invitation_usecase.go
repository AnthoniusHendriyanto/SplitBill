package usecase

import (
	"context"
	"errors"

	"github.com/user/split-mate/internal/domain"
)

type invitationUsecase struct {
	invRepo     domain.InvitationRepository
	userRepo    domain.UserRepository
	contactRepo domain.ContactRepository
}

func NewInvitationUsecase(invRepo domain.InvitationRepository, userRepo domain.UserRepository, contactRepo domain.ContactRepository) InvitationUsecase {
	return &invitationUsecase{invRepo: invRepo, userRepo: userRepo, contactRepo: contactRepo}
}

func (uc *invitationUsecase) Send(ctx context.Context, fromUserID, toEmail string) (*domain.Invitation, error) {
	inv := &domain.Invitation{
		FromUserID: fromUserID,
		ToEmail:    toEmail,
		Status:     "pending",
	}
	if err := uc.invRepo.Create(ctx, inv); err != nil {
		return nil, err
	}
	return inv, nil
}

func (uc *invitationUsecase) List(ctx context.Context, userID string) ([]domain.InvitationResponse, error) {
	invs, err := uc.invRepo.GetByUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	if invs == nil {
		return []domain.InvitationResponse{}, nil
	}

	fromUser, _ := uc.userRepo.GetByID(ctx, userID)

	var resps []domain.InvitationResponse
	for _, inv := range invs {
		resp := domain.InvitationResponse{
			ID:        inv.ID,
			ToEmail:   inv.ToEmail,
			Status:    inv.Status,
			CreatedAt: inv.CreatedAt,
		}
		if fu, err := uc.userRepo.GetByID(ctx, inv.FromUserID); err == nil {
			resp.FromUser = domain.UserResponse{
				ID: fu.ID, Email: fu.Email, Name: fu.Name, Tier: fu.Tier, CreatedAt: fu.CreatedAt,
			}
		}
		if inv.ToUserID != "" {
			if tu, err := uc.userRepo.GetByID(ctx, inv.ToUserID); err == nil {
				resp.ToUser = &domain.UserResponse{
					ID: tu.ID, Email: tu.Email, Name: tu.Name, Tier: tu.Tier, CreatedAt: tu.CreatedAt,
				}
			}
		}
		// Mark if received (not sent by current user)
		if inv.FromUserID != userID {
			resp.ToEmail = fromUser.Email
		}
		resps = append(resps, resp)
	}
	return resps, nil
}

func (uc *invitationUsecase) Accept(ctx context.Context, userID, invID string) error {
	inv, err := uc.invRepo.GetByID(ctx, invID)
	if err != nil {
		return err
	}
	if inv.Status != "pending" {
		return errors.New("invitation is not pending")
	}

	// Verify the accepting user's email matches
	acceptingUser, err := uc.userRepo.GetByID(ctx, userID)
	if err != nil {
		return err
	}
	if acceptingUser.Email != inv.ToEmail {
		return errors.New("this invitation was sent to a different email")
	}

	if err := uc.invRepo.UpdateStatus(ctx, invID, "accepted", userID); err != nil {
		return err
	}

	fromUser, _ := uc.userRepo.GetByID(ctx, inv.FromUserID)

	// Mutual contacts: add both sides
	uc.contactRepo.Create(ctx, &domain.Contact{
		UserID:          inv.FromUserID,
		Name:            acceptingUser.Name,
		ConnectedUserID: userID,
	})
	uc.contactRepo.Create(ctx, &domain.Contact{
		UserID:          userID,
		Name:            fromUser.Name,
		ConnectedUserID: inv.FromUserID,
	})

	return nil
}

func (uc *invitationUsecase) Reject(ctx context.Context, userID, invID string) error {
	inv, err := uc.invRepo.GetByID(ctx, invID)
	if err != nil {
		return err
	}
	if inv.Status != "pending" {
		return errors.New("invitation is not pending")
	}
	return uc.invRepo.UpdateStatus(ctx, invID, "rejected", userID)
}
