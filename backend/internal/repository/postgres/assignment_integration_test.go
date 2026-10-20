package postgres

import (
	"context"
	"errors"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/user/split-mate/internal/domain"
	"github.com/user/split-mate/internal/usecase"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"
)

// TEST_DATABASE_URL must point to a disposable local PostgreSQL instance.
func testPool(t *testing.T) *pgxpool.Pool {
	t.Helper()
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("set TEST_DATABASE_URL for PostgreSQL integration tests")
	}
	ctx := context.Background()
	admin, err := pgxpool.New(ctx, url)
	if err != nil {
		t.Fatal(err)
	}
	return preparePool(t, admin, url)
}

type emailTransport func(*http.Request) (*http.Response, error)

func (f emailTransport) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }

func TestFinalizeIdentityDeliveryAndSettlement(t *testing.T) {
	pool := testPool(t)
	ctx := context.Background()
	actor, friend, stranger := uuid.NewString(), uuid.NewString(), uuid.NewString()
	for i, id := range []string{actor, friend, stranger} {
		_, err := pool.Exec(ctx, `INSERT INTO users(id,email,password_hash,name,tier,premium_expires_at) VALUES($1,$2,'test','Same Name','premium',NOW()+INTERVAL '1 day')`, id, []string{"actor@example.test", "friend@example.test", "stranger@example.test"}[i])
		if err != nil {
			t.Fatal(err)
		}
	}
	contacts := NewContactRepository(pool)
	if err := contacts.Create(ctx, &domain.Contact{UserID: actor, Name: "Friend", ConnectedUserID: friend}); err != nil {
		t.Fatal(err)
	}
	list, err := contacts.GetByUserID(ctx, actor)
	if err != nil || len(list) != 1 || list[0].Email != "friend@example.test" {
		t.Fatalf("contacts %v %v", list, err)
	}
	users := NewUserRepository(pool)
	bills := NewBillRepository(pool)
	uc := usecase.NewBillUsecase(bills, NewItemRepository(pool), NewPersonRepository(pool), NewAssignmentRepository(pool), NewPaymentRepository(pool), NewUsageRepository(pool), users, contacts, nil, 10*time.Second)
	req := domain.CreateBillRequest{RequestKey: uuid.NewString(), Title: "Dinner", BillDate: "2026-10-16", SplitType: "custom", ServiceMode: "amount", TaxMode: "amount", Discount: 10,
		Items: []domain.ItemRequest{{ID: "i", Name: "Meal", Price: 100, Quantity: 1}}, Persons: []domain.PersonRequest{{ID: "a", Name: "Actor", UserID: actor, CustomAmount: 30}, {ID: "f", Name: "Fake name", UserID: friend, Email: "wrong@example.test", IsPayer: true, CustomAmount: 60}}}
	saved, err := uc.Create(ctx, actor, &req)
	if err != nil {
		t.Fatal(err)
	}
	if saved.Persons[1].Email != "friend@example.test" || saved.Persons[1].Name != "Same Name" {
		t.Fatal("client identity trusted")
	}
	detail, err := uc.GetByID(ctx, friend, saved.ID)
	if err != nil || detail.Bill.Persons[0].ShareAmount == nil {
		t.Fatalf("detail %v", err)
	}
	if err = uc.Delete(ctx, friend, saved.ID); !errors.Is(err, domain.ErrNotFound) {
		t.Fatalf("participant delete %v", err)
	}
	if _, err = uc.MarkPersonPaid(ctx, friend, saved.ID, saved.Payments[0].FromPersonID); !errors.Is(err, domain.ErrNotFound) {
		t.Fatal("participant write allowed")
	}
	retry, err := uc.Create(ctx, actor, &req)
	if err != nil || retry.ID != saved.ID {
		t.Fatal("retry changed bill")
	}
	req.RequestKey = uuid.NewString()
	req.Persons[1].UserID = stranger
	if _, err = uc.Create(ctx, actor, &req); !errors.Is(err, domain.ErrInvalidInput) {
		t.Fatal("unlinked account accepted")
	}
	req.Persons[1].UserID = ""
	req.Persons[1].Name = "Same Name"
	plain, err := uc.Create(ctx, actor, &req)
	if err != nil || plain.Persons[1].UserID != nil {
		t.Fatalf("name-only linked: %v", err)
	}
	nr := &NotificationRepository{Pool: pool}
	notices, err := nr.List(ctx, friend, 1)
	if err != nil || len(notices) != 1 {
		t.Fatal("wrong notices")
	}
	var firstKey string
	client := &http.Client{Transport: emailTransport(func(r *http.Request) (*http.Response, error) {
		firstKey = r.Header.Get("Idempotency-Key")
		body, _ := io.ReadAll(r.Body)
		if strings.Contains(string(body), "wrong@example") || strings.Contains(string(body), "Dinner") || !strings.Contains(string(body), "/bill/") {
			t.Error("wrong/private email content")
		}
		return &http.Response{StatusCode: 503, Body: io.NopCloser(strings.NewReader(""))}, nil
	})}
	if _, err = nr.deliverOne(ctx, client, "test-key", "test@example.test", "https://split.test"); err != nil {
		t.Fatal(err)
	}
	var state string
	pool.QueryRow(ctx, `SELECT email_status FROM notifications WHERE id=$1`, notices[0].ID).Scan(&state)
	if state != "queued" {
		t.Fatal("transient failure not queued")
	}
	pool.Exec(ctx, `UPDATE notifications SET next_attempt_at=NOW()`)
	client.Transport = emailTransport(func(r *http.Request) (*http.Response, error) {
		if firstKey == "" || r.Header.Get("Idempotency-Key") != firstKey {
			t.Error("unstable provider key")
		}
		return &http.Response{StatusCode: 202, Body: io.NopCloser(strings.NewReader(""))}, nil
	})
	if _, err = nr.deliverOne(ctx, client, "test-key", "test@example.test", "https://split.test"); err != nil {
		t.Fatal(err)
	}
	pool.QueryRow(ctx, `SELECT email_status FROM notifications WHERE id=$1`, notices[0].ID).Scan(&state)
	if state != "sent" {
		t.Fatal("delivery not recorded")
	}
	if _, err = uc.MarkPersonPaid(ctx, actor, saved.ID, saved.Payments[0].FromPersonID); err != nil {
		t.Fatal(err)
	}
	final, err := uc.GetByID(ctx, actor, saved.ID)
	if err != nil || final.Bill.Status != "completed" {
		t.Fatalf("settlement not completed %v", err)
	}
}

func TestInvitationRecipientAndAtomicContacts(t *testing.T) {
	pool := testPool(t)
	ctx := context.Background()
	sender, recipient, outsider := uuid.NewString(), uuid.NewString(), uuid.NewString()
	for i, id := range []string{sender, recipient, outsider} {
		_, err := pool.Exec(ctx, `INSERT INTO users(id,email,password_hash,name)VALUES($1,$2,'test','Person')`, id, []string{"sender@example.test", "recipient@example.test", "outsider@example.test"}[i])
		if err != nil {
			t.Fatal(err)
		}
	}
	ir := NewInvitationRepository(pool)
	inv := &domain.Invitation{FromUserID: sender, ToEmail: "recipient@example.test", Status: "pending"}
	if err := ir.Create(ctx, inv); err != nil {
		t.Fatal(err)
	}
	uc := usecase.NewInvitationUsecase(ir, NewUserRepository(pool), NewContactRepository(pool))
	if err := uc.Reject(ctx, outsider, inv.ID); err == nil {
		t.Fatal("outsider rejected invitation")
	}
	if err := uc.Accept(ctx, recipient, inv.ID); err != nil {
		t.Fatal(err)
	}
	if err := uc.Accept(ctx, recipient, inv.ID); err == nil {
		t.Fatal("accepted twice")
	}
	var count int
	pool.QueryRow(ctx, `SELECT COUNT(*) FROM contacts`).Scan(&count)
	if count != 2 {
		t.Fatal("mutual contacts missing")
	}
}

func TestFreeItemSplitAndCompleteBalances(t *testing.T) {
	pool := testPool(t)
	ctx := context.Background()
	actor := uuid.NewString()
	if _, err := pool.Exec(ctx, `INSERT INTO users(id,email,password_hash,name) VALUES($1,'actor@example.test','test','Actor')`, actor); err != nil {
		t.Fatal(err)
	}
	bills := NewBillRepository(pool)
	uc := usecase.NewBillUsecase(bills, NewItemRepository(pool), NewPersonRepository(pool), NewAssignmentRepository(pool), NewPaymentRepository(pool), NewUsageRepository(pool), NewUserRepository(pool), NewContactRepository(pool), nil, 10*time.Second)
	for i := 0; i < 21; i++ {
		req := domain.CreateBillRequest{RequestKey: uuid.NewString(), Title: "Lunch", BillDate: "2026-10-18", SplitType: "shared_items", ServiceMode: "amount", TaxMode: "amount",
			Items:       []domain.ItemRequest{{ID: "meal", Name: "Meal", Price: 100, Quantity: 1}},
			Persons:     []domain.PersonRequest{{ID: "a", Name: "Actor", UserID: actor, IsPayer: true}, {ID: "b", Name: "Friend"}},
			Assignments: []domain.AssignmentRequest{{ItemID: "meal", PersonID: "b"}}}
		if _, err := uc.Create(ctx, actor, &req); err != nil {
			t.Fatalf("free By Item: %v", err)
		}
		if i == 0 {
			req.RequestKey = uuid.NewString()
			req.SplitType = "custom"
			if _, err := uc.Create(ctx, actor, &req); !errors.Is(err, domain.ErrPremiumRequired) {
				t.Fatalf("custom premium enforcement: %v", err)
			}
		}
	}
	first, err := uc.Fetch(ctx, actor, 1, 20, "", "")
	if err != nil || len(first.Data) != 20 || first.Pagination.TotalItems != 21 {
		t.Fatalf("first page: %v %v", first, err)
	}
	for _, b := range first.Data {
		if b.PersonCount != 2 || b.PayerName != "Actor" || b.Receivable != 100 {
			t.Fatalf("summary: %+v", b)
		}
	}
	second, err := uc.Fetch(ctx, actor, 2, 20, "", "")
	if err != nil || len(second.Data) != 1 {
		t.Fatalf("second page: %v %v", second, err)
	}
	for _, b := range first.Data {
		if b.ID == second.Data[0].ID {
			t.Fatal("overlapping pages")
		}
	}
	debts, err := (&NotificationRepository{Pool: pool}).Debts(ctx, actor)
	if err != nil || len(debts) != 21 {
		t.Fatalf("complete balances: %v %v", debts, err)
	}
	if _, err := pool.Exec(ctx, `ALTER TABLE payments RENAME TO unavailable_payments`); err != nil {
		t.Fatal(err)
	}
	if _, err := uc.Fetch(ctx, actor, 1, 20, "", ""); err == nil {
		t.Fatal("payment summary failure reported as zero")
	}
}
func preparePool(t *testing.T, admin *pgxpool.Pool, url string) *pgxpool.Pool {
	ctx := context.Background()
	schema := "test_" + uuid.NewString()[:8]
	if _, err := admin.Exec(ctx, "CREATE SCHEMA "+schema); err != nil {
		t.Fatal(err)
	}
	cfg, err := pgxpool.ParseConfig(url)
	if err != nil {
		t.Fatal(err)
	}
	cfg.ConnConfig.RuntimeParams["search_path"] = schema + ",public"
	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { pool.Close(); admin.Exec(ctx, "DROP SCHEMA "+schema+" CASCADE"); admin.Close() })
	files, err := filepath.Glob("../../../migrations/*.sql")
	if err != nil {
		t.Fatal(err)
	}
	for _, file := range files {
		data, err := os.ReadFile(file)
		if err != nil {
			t.Fatal(err)
		}
		if _, err = pool.Exec(ctx, string(data)); err != nil {
			t.Fatalf("%s: %v", file, err)
		}
	}
	return pool
}
func TestAtomicAssignmentAndRecipientAccess(t *testing.T) {
	pool := testPool(t)
	ctx := context.Background()
	actor, friend, stranger := uuid.NewString(), uuid.NewString(), uuid.NewString()
	for i, id := range []string{actor, friend, stranger} {
		if _, err := pool.Exec(ctx, `INSERT INTO users(id,email,password_hash,name) VALUES($1,$2,'test','Same Name')`, id, []string{"actor@example.test", "friend@example.test", "stranger@example.test"}[i]); err != nil {
			t.Fatal(err)
		}
	}
	repo := &billRepository{Pool: pool}
	nr := &NotificationRepository{Pool: pool}
	now := time.Now()
	share := 50.0
	build := func(key string) (*domain.Bill, []domain.Item, []domain.Person) {
		b := &domain.Bill{UserID: actor, Title: "Dinner", RequestKey: key, RequestHash: "payload", TotalAmount: 100, GrandTotal: 100, ServiceMode: "amount", TaxMode: "amount", Status: "pending", SplitType: "equal", BillDate: "2026-10-16", CreatedAt: now, UpdatedAt: now, Payments: []domain.Payment{{FromPersonID: "a", ToPersonID: "f", Amount: 50, CreatedAt: now}}}
		return b, []domain.Item{{ID: "i", Name: "meal", Price: 100, Quantity: 1, CreatedAt: now}}, []domain.Person{{ID: "a", Name: "Actor", UserID: &actor, ShareAmount: &share, CreatedAt: now}, {ID: "f", Name: "Friend", UserID: &friend, IsPayer: true, ShareAmount: &share, CreatedAt: now}}
	}
	key := uuid.NewString()
	b, items, persons := build(key)
	if err := repo.CreateFull(ctx, b, items, persons, nil); err != nil {
		t.Fatal(err)
	}
	rows, err := nr.List(ctx, friend, 1)
	if err != nil || len(rows) != 1 {
		t.Fatalf("recipient inbox %v %v", rows, err)
	}
	own, _ := nr.List(ctx, actor, 1)
	if len(own) != 0 {
		t.Fatal("self notified")
	}
	if _, err = repo.GetByUserIDAndID(ctx, stranger, b.ID); !errors.Is(err, domain.ErrNotFound) {
		t.Fatalf("namesake access: %v", err)
	}
	if _, err = repo.GetByUserIDAndID(ctx, friend, b.ID); err != nil {
		t.Fatal(err)
	}
	if err = nr.Read(ctx, stranger, rows[0].ID); !errors.Is(err, domain.ErrNotFound) {
		t.Fatal("stranger marked notification read")
	}
	debts, err := nr.Debts(ctx, actor)
	if err != nil || len(debts) != 1 || debts[0].Name != "Friend" || debts[0].Direction != "payable" {
		t.Fatalf("payer debt %v %v", debts, err)
	}
	if err = nr.Read(ctx, friend, rows[0].ID); err != nil {
		t.Fatal(err)
	}
	var wg sync.WaitGroup
	for i := 0; i < 4; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			again, it, ps := build(key)
			if err := repo.CreateFull(ctx, again, it, ps, nil); err != nil {
				t.Error(err)
			}
			if again.ID != b.ID {
				t.Error("duplicate bill")
			}
		}()
	}
	wg.Wait()
	var count int
	if err = pool.QueryRow(ctx, `SELECT COUNT(*) FROM bills`).Scan(&count); err != nil || count != 1 {
		t.Fatalf("duplicate count %d %v", count, err)
	}
	if _, err = repo.FindRequest(ctx, actor, key, "changed"); !errors.Is(err, domain.ErrInvalidInput) {
		t.Fatal("changed payload accepted")
	}
	broken, it, ps := build(uuid.NewString())
	broken.Payments[0].Amount = -1
	if err = repo.CreateFull(ctx, broken, it, ps, nil); err == nil {
		t.Fatal("invalid payment committed")
	}
	pool.QueryRow(ctx, `SELECT COUNT(*) FROM bills`).Scan(&count)
	if count != 1 {
		t.Fatal("partial bill committed")
	}
	pool.QueryRow(ctx, `SELECT COUNT(*) FROM notifications`).Scan(&count)
	if count != 1 {
		t.Fatal("partial notification committed")
	}
	pr := &paymentRepository{Pool: pool}
	if _, err = pr.MarkPersonPaymentsPaid(ctx, b.ID, b.Payments[0].FromPersonID); err != nil {
		t.Fatal(err)
	}
	debts, err = nr.Debts(ctx, actor)
	if err != nil || len(debts) != 0 {
		t.Fatal("settled debt remains")
	}
}
