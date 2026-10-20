package usecase

import (
	"context"
	"strings"
	"time"

	"github.com/user/split-mate/internal/domain"
)

type groupUsecase struct {
	repo    domain.GroupRepository
	timeout time.Duration
}

func NewGroupUsecase(repo domain.GroupRepository, timeout time.Duration) GroupUsecase {
	return &groupUsecase{repo: repo, timeout: timeout}
}

func (u *groupUsecase) Create(ctx context.Context, userID string, req *domain.CreateGroupRequest) (*domain.Group, error) {
	if strings.TrimSpace(req.Name) == "" {
		return nil, domain.ErrInvalidInput
	}
	ctx, cancel := context.WithTimeout(ctx, u.timeout)
	defer cancel()
	now := time.Now()
	group := &domain.Group{OwnerID: userID, Name: strings.TrimSpace(req.Name), CreatedAt: now, UpdatedAt: now}
	if err := u.repo.Create(ctx, group); err != nil {
		return nil, err
	}
	return group, nil
}

func (u *groupUsecase) List(ctx context.Context, userID string) ([]domain.Group, error) {
	ctx, cancel := context.WithTimeout(ctx, u.timeout)
	defer cancel()
	return u.repo.ListByUserID(ctx, userID)
}

func (u *groupUsecase) GetDetail(ctx context.Context, userID, groupID string) (*domain.GroupDetail, error) {
	ctx, cancel := context.WithTimeout(ctx, u.timeout)
	defer cancel()
	return u.repo.GetDetail(ctx, userID, groupID)
}

func (u *groupUsecase) Delete(ctx context.Context, userID, groupID string) error {
	ctx, cancel := context.WithTimeout(ctx, u.timeout)
	defer cancel()
	return u.repo.Delete(ctx, userID, groupID)
}

func (u *groupUsecase) AddMember(ctx context.Context, userID, groupID string, req *domain.AddGroupMemberRequest) (*domain.GroupMember, error) {
	ctx, cancel := context.WithTimeout(ctx, u.timeout)
	defer cancel()
	detail, err := u.repo.GetDetail(ctx, userID, groupID)
	if err != nil {
		return nil, err
	}
	if detail.Group.OwnerID != userID {
		return nil, domain.ErrNotFound
	}
	member := &domain.GroupMember{GroupID: groupID, DisplayName: strings.TrimSpace(req.DisplayName), Role: "member"}
	if req.UserID != "" {
		member.UserID = &req.UserID
	}
	if member.DisplayName == "" {
		return nil, domain.ErrInvalidInput
	}
	if err := u.repo.AddMember(ctx, groupID, member); err != nil {
		return nil, err
	}
	return member, nil
}

func (u *groupUsecase) RemoveMember(ctx context.Context, userID, groupID, memberID string) error {
	ctx, cancel := context.WithTimeout(ctx, u.timeout)
	defer cancel()
	return u.repo.RemoveMember(ctx, userID, groupID, memberID)
}

func (u *groupUsecase) AttachBill(ctx context.Context, userID, groupID, billID string, req *domain.AttachBillRequest) error {
	ctx, cancel := context.WithTimeout(ctx, u.timeout)
	defer cancel()
	return u.repo.AttachBill(ctx, userID, groupID, billID, req.Members)
}

func (u *groupUsecase) GetDefaultSplit(ctx context.Context, userID, groupID string) (*domain.GroupDefaultSplit, error) {
	ctx, cancel := context.WithTimeout(ctx, u.timeout)
	defer cancel()
	return u.repo.GetDefaultSplit(ctx, userID, groupID)
}

func (u *groupUsecase) SetDefaultSplit(ctx context.Context, userID, groupID string, split *domain.GroupDefaultSplit) error {
	if split.SplitType != "equal" && split.SplitType != "shared_items" && split.SplitType != "percentage" && split.SplitType != "custom" {
		return domain.ErrInvalidInput
	}
	ctx, cancel := context.WithTimeout(ctx, u.timeout)
	defer cancel()
	return u.repo.SetDefaultSplit(ctx, userID, groupID, split)
}
