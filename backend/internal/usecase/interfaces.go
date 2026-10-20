package usecase

import (
	"context"
	"time"

	"github.com/user/split-mate/internal/domain"
)

type AuthUsecase interface {
	Register(ctx context.Context, req *domain.RegisterRequest) (*domain.AuthResponse, error)
	Login(ctx context.Context, req *domain.LoginRequest) (*domain.AuthResponse, error)
	RefreshToken(ctx context.Context, refreshToken string) (*domain.AuthResponse, error)
	Logout(ctx context.Context, refreshToken string) error
	GetMe(ctx context.Context, userID string) (*domain.UserResponse, error)
	UpdateMe(ctx context.Context, userID string, req *domain.UpdateUserRequest) (*domain.UserResponse, error)
	ValidateToken(tokenString string) (string, error)
}

type BillUsecase interface {
	Create(ctx context.Context, userID string, req *domain.CreateBillRequest) (*domain.Bill, error)
	Update(ctx context.Context, userID, billID string, req *domain.UpdateBillRequest) (*domain.Bill, error)
	Fetch(ctx context.Context, userID string, page, limit int, fromDate, toDate string) (*domain.BillListResponse, error)
	GetByID(ctx context.Context, userID, billID string) (*domain.BillDetailResponse, error)
	Delete(ctx context.Context, userID, billID string) error
	ProcessOCR(ctx context.Context, userID string, imageBytes []byte) (*domain.OCRResult, error)
	UpdateStatus(ctx context.Context, userID, billID, status string) error
	MarkPersonPaid(ctx context.Context, userID, billID, personID string) (*domain.Bill, error)
	GetUsage(ctx context.Context, userID string) (*domain.UsageResponse, error)
	CreateShare(ctx context.Context, userID, billID string, days int) (*domain.ShareLink, error)
	RevokeShare(ctx context.Context, userID, billID string) error
	GetShared(ctx context.Context, token string) (*domain.PublicBill, error)
	GetReceipt(ctx context.Context, userID, billID string) ([]byte, string, error)
}

type GroupUsecase interface {
	Create(ctx context.Context, userID string, req *domain.CreateGroupRequest) (*domain.Group, error)
	List(ctx context.Context, userID string) ([]domain.Group, error)
	GetDetail(ctx context.Context, userID, groupID string) (*domain.GroupDetail, error)
	Delete(ctx context.Context, userID, groupID string) error
	AddMember(ctx context.Context, userID, groupID string, req *domain.AddGroupMemberRequest) (*domain.GroupMember, error)
	RemoveMember(ctx context.Context, userID, groupID, memberID string) error
	AttachBill(ctx context.Context, userID, groupID, billID string, req *domain.AttachBillRequest) error
	GetDefaultSplit(ctx context.Context, userID, groupID string) (*domain.GroupDefaultSplit, error)
	SetDefaultSplit(ctx context.Context, userID, groupID string, split *domain.GroupDefaultSplit) error
}

type RecurrenceUsecase interface {
	Create(ctx context.Context, userID string, req *domain.CreateRecurrenceRequest) (*domain.Recurrence, error)
	List(ctx context.Context, userID string) ([]domain.Recurrence, error)
	SetStatus(ctx context.Context, userID, id, status string) error
	GenerateDue(ctx context.Context, now time.Time) error
}

type PremiumUsecase interface {
	Subscribe(ctx context.Context, userID string, req *domain.PremiumSubscribeRequest) (*domain.PremiumSubscribeResponse, error)
	ConfirmPayment(ctx context.Context, req *domain.PremiumCallbackRequest) error
}

type ContactUsecase interface {
	List(ctx context.Context, userID string) ([]domain.Contact, error)
	Create(ctx context.Context, userID, name string) (*domain.Contact, error)
	Delete(ctx context.Context, id, userID string) error
}

type InvitationUsecase interface {
	Send(ctx context.Context, fromUserID, toEmail string) (*domain.Invitation, error)
	List(ctx context.Context, userID string) ([]domain.InvitationResponse, error)
	Accept(ctx context.Context, userID, invID string) error
	Reject(ctx context.Context, userID, invID string) error
}
