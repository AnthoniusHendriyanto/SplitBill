package postgres

import (
	"context"
	"encoding/base64"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/user/split-mate/internal/domain"
	"github.com/user/split-mate/internal/usecase"
)

func TestP0GroupShareAndReceiptFlow(t *testing.T) {
	pool := testPool(t)
	ctx := context.Background()
	actor, member := uuid.NewString(), uuid.NewString()
	for _, user := range []struct{ id, email, name string }{{actor, "owner@p0.test", "Owner"}, {member, "member@p0.test", "Member"}} {
		if _, err := pool.Exec(ctx, `INSERT INTO users(id,email,password_hash,name,tier,premium_expires_at) VALUES($1,$2,'test',$3,'premium',NOW()+INTERVAL '1 day')`, user.id, user.email, user.name); err != nil {
			t.Fatal(err)
		}
	}
	contacts := NewContactRepository(pool)
	if err := contacts.Create(ctx, &domain.Contact{UserID: actor, Name: "Member", ConnectedUserID: member}); err != nil {
		t.Fatal(err)
	}
	users := NewUserRepository(pool)
	bills := NewBillRepository(pool)
	people := NewPersonRepository(pool)
	groups := NewGroupRepository(pool)
	groupUC := usecase.NewGroupUsecase(groups, 10*time.Second)
	group, err := groupUC.Create(ctx, actor, &domain.CreateGroupRequest{Name: "Dinner group"})
	if err != nil {
		t.Fatal(err)
	}
	createdDetail, err := groupUC.GetDetail(ctx, actor, group.ID)
	if err != nil {
		t.Fatal(err)
	}
	if len(createdDetail.Group.Members) != 1 || createdDetail.Group.Members[0].DisplayName != "Owner" {
		t.Fatalf("owner member should use the user's name, got %+v", createdDetail.Group.Members)
	}
	if _, err := groupUC.AddMember(ctx, actor, group.ID, &domain.AddGroupMemberRequest{UserID: member, DisplayName: "Member"}); err != nil {
		t.Fatal(err)
	}

	uc := usecase.NewBillUsecaseWithShare(bills, NewItemRepository(pool), people, NewAssignmentRepository(pool), NewPaymentRepository(pool), NewUsageRepository(pool), users, contacts, nil, NewShareRepository(pool), 10*time.Second)
	receipt := base64.StdEncoding.EncodeToString([]byte("receipt"))
	saved, err := uc.Create(ctx, actor, &domain.CreateBillRequest{
		RequestKey: uuid.NewString(), Title: "Dinner", BillDate: "2026-10-20", SplitType: "equal", ServiceMode: "amount", TaxMode: "amount", Status: "pending",
		ReceiptImage: "data:image/jpeg;base64," + receipt, ReceiptMime: "image/jpeg",
		Items:   []domain.ItemRequest{{ID: "item", Name: "Meal", Price: 100, Quantity: 1}},
		Persons: []domain.PersonRequest{{ID: "owner", Name: "Owner", UserID: actor, IsPayer: true}, {ID: "member", Name: "Member", UserID: member}},
	})
	if err != nil {
		t.Fatal(err)
	}
	updateReq := &domain.UpdateBillRequest{RequestKey: uuid.NewString(), Title: "Dinner updated", Merchant: "Cafe", BillDate: "2026-10-20", SplitType: "equal", ServiceMode: "amount", TaxMode: "amount", Status: "pending", Items: []domain.ItemRequest{{ID: "updated-item", Name: "Meal", Price: 120, Quantity: 1}}, Persons: []domain.PersonRequest{{ID: saved.Persons[0].ID, Name: "Owner", UserID: actor, IsPayer: true}, {ID: saved.Persons[1].ID, Name: "Member", UserID: member}}}
	updated, err := uc.Update(ctx, actor, saved.ID, updateReq)
	if err != nil || updated.Title != "Dinner updated" || updated.GrandTotal != 120 {
		t.Fatalf("update bill: %v %+v", err, updated)
	}
	retried, err := uc.Update(ctx, actor, saved.ID, updateReq)
	if err != nil || retried.ID != saved.ID || retried.GrandTotal != 120 {
		t.Fatalf("update retry: %v %+v", err, retried)
	}
	detail, err := groupUC.GetDetail(ctx, actor, group.ID)
	if err != nil || len(detail.Group.Members) != 2 {
		t.Fatalf("group detail before attach: %v %+v", err, detail)
	}
	var ownerMember, linkedMember string
	for _, m := range detail.Group.Members {
		if m.UserID != nil && *m.UserID == actor {
			ownerMember = m.ID
		}
		if m.UserID != nil && *m.UserID == member {
			linkedMember = m.ID
		}
	}
	if err := groupUC.AttachBill(ctx, actor, group.ID, saved.ID, &domain.AttachBillRequest{Members: []domain.GroupBillMemberRequest{{GroupMemberID: ownerMember, PersonID: updated.Persons[0].ID}, {GroupMemberID: linkedMember, PersonID: updated.Persons[1].ID}}}); err != nil {
		t.Fatal(err)
	}
	detail, err = groupUC.GetDetail(ctx, member, group.ID)
	if err != nil || len(detail.Bills) != 1 || len(detail.Balances) != 2 {
		t.Fatalf("group detail after attach: %v %+v", err, detail)
	}
	if detail.Balances[0].Paid != 60 || detail.Balances[1].Owed != 60 {
		t.Fatalf("unexpected group balances: %+v", detail.Balances)
	}

	link, err := uc.CreateShare(ctx, actor, saved.ID, 7)
	if err != nil || link.Token == "" {
		t.Fatalf("create share: %v %+v", err, link)
	}
	public, err := uc.GetShared(ctx, link.Token)
	if err != nil || len(public.Items) != 1 || len(public.Persons) != 2 {
		t.Fatalf("public share: %v %+v", err, public)
	}
	receiptBytes, mime, err := uc.GetReceipt(ctx, member, saved.ID)
	if err != nil || string(receiptBytes) != "receipt" || mime != "image/jpeg" {
		t.Fatalf("receipt access: %v %q %s", err, receiptBytes, mime)
	}
	if err := uc.RevokeShare(ctx, actor, saved.ID); err != nil {
		t.Fatal(err)
	}
	if _, err := uc.GetShared(ctx, link.Token); err == nil {
		t.Fatal("revoked share still accessible")
	}
	recurrenceUC := usecase.NewRecurrenceUsecase(NewRecurrenceRepository(pool), uc, 10*time.Second)
	recurrence, err := recurrenceUC.Create(ctx, actor, &domain.CreateRecurrenceRequest{Cadence: "monthly", Interval: 1, NextRun: "2026-10-01", Template: domain.CreateBillRequest{Title: "Monthly dinner", BillDate: "2026-10-01", SplitType: "equal", ServiceMode: "amount", TaxMode: "amount", Items: []domain.ItemRequest{{ID: "meal", Name: "Meal", Price: 80, Quantity: 1}}, Persons: []domain.PersonRequest{{ID: "owner", Name: "Owner", UserID: actor, IsPayer: true}, {ID: "member", Name: "Member", UserID: member}}}})
	if err != nil {
		t.Fatal(err)
	}
	if err := recurrenceUC.GenerateDue(ctx, time.Date(2026, 10, 20, 0, 0, 0, 0, time.UTC)); err != nil {
		t.Fatal(err)
	}
	generated, err := recurrenceUC.List(ctx, actor)
	if err != nil || len(generated) != 1 || generated[0].NextRun != "2026-11-01" {
		t.Fatalf("recurrence generation: %v %+v", err, generated)
	}
	if recurrence.ID != generated[0].ID {
		t.Fatal("recurrence identity changed")
	}
	if _, err := uc.MarkPersonPaid(ctx, actor, saved.ID, updated.Persons[1].ID); err != nil {
		t.Fatal(err)
	}
	updateReq.RequestKey = uuid.NewString()
	if _, err := uc.Update(ctx, actor, saved.ID, updateReq); !errors.Is(err, domain.ErrInvalidInput) {
		t.Fatalf("paid bill edit was accepted: %v", err)
	}
}
