package usecase

import (
	"context"
	"crypto/sha256"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/user/split-mate/internal/domain"
)

type recurrenceUsecase struct {
	repo    domain.RecurrenceRepository
	bills   BillUsecase
	timeout time.Duration
}

func NewRecurrenceUsecase(repo domain.RecurrenceRepository, bills BillUsecase, timeout time.Duration) RecurrenceUsecase {
	return &recurrenceUsecase{repo: repo, bills: bills, timeout: timeout}
}

func (u *recurrenceUsecase) Create(ctx context.Context, userID string, req *domain.CreateRecurrenceRequest) (*domain.Recurrence, error) {
	if req.Interval < 1 {
		req.Interval = 1
	}
	if req.Cadence != "weekly" && req.Cadence != "monthly" && req.Cadence != "yearly" {
		return nil, domain.ErrInvalidInput
	}
	if _, err := time.Parse("2006-01-02", req.NextRun); err != nil {
		return nil, fmt.Errorf("%w: invalid next_run", domain.ErrInvalidInput)
	}
	if req.Template.Status == "draft" {
		return nil, fmt.Errorf("%w: recurring templates cannot be drafts", domain.ErrInvalidInput)
	}
	ctx, cancel := context.WithTimeout(ctx, u.timeout)
	defer cancel()
	now := time.Now()
	recurrence := &domain.Recurrence{OwnerID: userID, Cadence: req.Cadence, Interval: req.Interval, NextRun: req.NextRun, Status: "active", Template: req.Template, CreatedAt: now, UpdatedAt: now}
	recurrence.Template.RequestKey = ""
	recurrence.Template.Status = "pending"
	for i := range recurrence.Template.Items {
		if recurrence.Template.Items[i].ID == "" {
			recurrence.Template.Items[i].ID = uuid.NewString()
		}
	}
	for i := range recurrence.Template.Persons {
		if recurrence.Template.Persons[i].ID == "" {
			recurrence.Template.Persons[i].ID = uuid.NewString()
		}
	}
	if err := u.repo.Create(ctx, recurrence); err != nil {
		return nil, err
	}
	return recurrence, nil
}

func (u *recurrenceUsecase) List(ctx context.Context, userID string) ([]domain.Recurrence, error) {
	ctx, cancel := context.WithTimeout(ctx, u.timeout)
	defer cancel()
	return u.repo.ListByOwner(ctx, userID)
}

func (u *recurrenceUsecase) SetStatus(ctx context.Context, userID, id, status string) error {
	if status != "active" && status != "paused" && status != "cancelled" {
		return domain.ErrInvalidInput
	}
	ctx, cancel := context.WithTimeout(ctx, u.timeout)
	defer cancel()
	return u.repo.SetStatus(ctx, userID, id, status)
}

func (u *recurrenceUsecase) GenerateDue(ctx context.Context, now time.Time) error {
	ctx, cancel := context.WithTimeout(ctx, u.timeout)
	defer cancel()
	due, err := u.repo.ListDue(ctx, now.Format("2006-01-02"))
	if err != nil {
		return err
	}
	for _, recurrence := range due {
		runDate := recurrence.NextRun
		_, err := u.repo.ClaimOccurrence(ctx, recurrence.ID, runDate)
		if err != nil {
			return err
		}
		// An existing uncompleted claim is retried with the same request key;
		// Create's idempotency snapshot prevents a duplicate after a crash.
		req := recurrence.Template
		req.RequestKey = recurrenceRequestKey(recurrence.ID, runDate)
		req.BillDate = runDate
		req.Status = "pending"
		bill, err := u.bills.Create(ctx, recurrence.OwnerID, &req)
		if err != nil {
			_ = u.repo.ReleaseOccurrence(ctx, recurrence.ID, runDate)
			return err
		}
		next, err := advanceDate(runDate, recurrence.Cadence, recurrence.Interval)
		if err != nil {
			_ = u.repo.ReleaseOccurrence(ctx, recurrence.ID, runDate)
			return err
		}
		if err := u.repo.CompleteOccurrence(ctx, recurrence.ID, runDate, bill.ID, next); err != nil {
			_ = u.repo.ReleaseOccurrence(ctx, recurrence.ID, runDate)
			return err
		}
	}
	return nil
}

func advanceDate(value, cadence string, interval int) (string, error) {
	date, err := time.Parse("2006-01-02", strings.TrimSpace(value))
	if err != nil {
		return "", err
	}
	if interval < 1 {
		interval = 1
	}
	switch cadence {
	case "weekly":
		date = date.AddDate(0, 0, 7*interval)
	case "monthly":
		year, month, day := date.Date()
		target := time.Date(year, month+time.Month(interval)+1, 0, 0, 0, 0, 0, time.UTC)
		if day > target.Day() {
			day = target.Day()
		}
		date = time.Date(year, month+time.Month(interval), day, 0, 0, 0, 0, time.UTC)
	case "yearly":
		year, month, day := date.Date()
		target := time.Date(year+interval, month+1, 0, 0, 0, 0, 0, time.UTC)
		if day > target.Day() {
			day = target.Day()
		}
		date = time.Date(year+interval, month, day, 0, 0, 0, 0, time.UTC)
	default:
		return "", domain.ErrInvalidInput
	}
	return date.Format("2006-01-02"), nil
}

func recurrenceRequestKey(id, runDate string) string {
	digest := sha256.Sum256([]byte("recurrence:" + id + ":" + runDate))
	return uuid.UUID(digest[:16]).String()
}
