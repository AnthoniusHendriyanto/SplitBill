package memory

import (
	"context"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/user/split-mate/internal/domain"
)

// Repositories holds all in-memory repository implementations.
type Repositories struct {
	User       domain.UserRepository
	Bill       domain.BillRepository
	Item       domain.ItemRepository
	Person     domain.PersonRepository
	Assignment domain.AssignmentRepository
	Payment    domain.PaymentRepository
	Share      domain.ShareRepository
	Usage      domain.UsageRepository
}

// NewRepositories creates all in-memory repositories with proper internal wiring.
func NewRepositories() *Repositories {
	ar := &assignmentRepository{
		assignments: make(map[string]*domain.ItemAssignment),
		itemBills:   make(map[string]string),
	}
	ir := &itemRepository{
		items:          make(map[string]*domain.Item),
		assignmentRepo: ar,
	}
	return &Repositories{
		User: &userRepository{users: make(map[string]*domain.User), refreshTokens: make(map[string]bool)},
		Bill: &billRepository{
			bills:          make(map[string]*domain.Bill),
			itemRepo:       ir,
			personRepo:     &personRepository{persons: make(map[string]*domain.Person)},
			assignmentRepo: ar,
			paymentRepo:    &paymentRepository{payments: make(map[string]*domain.Payment)},
		},
		Item:       ir,
		Person:     &personRepository{persons: make(map[string]*domain.Person)},
		Assignment: ar,
		Payment:    &paymentRepository{payments: make(map[string]*domain.Payment)},
		Share:      &shareRepository{shares: make(map[string]*domain.Share)},
		Usage:      &usageRepository{usage: make(map[string]*domain.UsageTracking)},
	}
}

// ---- User Repository ----

type userRepository struct {
	mu           sync.Mutex
	users        map[string]*domain.User
	refreshTokens map[string]bool
}

func (r *userRepository) Create(_ context.Context, user *domain.User) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	for _, u := range r.users {
		if strings.EqualFold(u.Email, user.Email) {
			return domain.ErrAlreadyExists
		}
	}
	if user.ID == "" {
		user.ID = uuid.New().String()
	}
	now := time.Now()
	user.CreatedAt = now
	user.UpdatedAt = now
	r.users[user.ID] = user
	return nil
}

func (r *userRepository) GetByID(_ context.Context, id string) (domain.User, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	u, ok := r.users[id]
	if !ok {
		return domain.User{}, domain.ErrNotFound
	}
	return *u, nil
}

func (r *userRepository) GetByEmail(_ context.Context, email string) (domain.User, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	for _, u := range r.users {
		if strings.EqualFold(u.Email, email) {
			return *u, nil
		}
	}
	return domain.User{}, domain.ErrNotFound
}

func (r *userRepository) Update(_ context.Context, user *domain.User) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	_, ok := r.users[user.ID]
	if !ok {
		return domain.ErrNotFound
	}
	user.UpdatedAt = time.Now()
	r.users[user.ID] = user
	return nil
}

func (r *userRepository) UpdateTier(_ context.Context, userID string, tier string, expiresAt *string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	u, ok := r.users[userID]
	if !ok {
		return domain.ErrNotFound
	}
	u.Tier = tier
	u.UpdatedAt = time.Now()
	if expiresAt != nil {
		t, err := time.Parse(time.RFC3339, *expiresAt)
		if err == nil {
			u.PremiumExpiresAt = &t
		}
	}
	return nil
}

func (r *userRepository) Delete(_ context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.users, id)
	return nil
}

func (r *userRepository) SaveRefreshToken(_ context.Context, userID, token string, _ int64) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.refreshTokens[token] = true
	return nil
}

func (r *userRepository) DeleteRefreshToken(_ context.Context, token string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.refreshTokens, token)
	return nil
}

func (r *userRepository) ReplaceRefreshToken(_ context.Context, oldToken, newToken, userID string, expiresAt int64) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.refreshTokens, oldToken)
	r.refreshTokens[newToken] = true
	return nil
}

// ---- Bill Repository ----

type billRepository struct {
	mu             sync.Mutex
	bills          map[string]*domain.Bill
	itemRepo       *itemRepository
	personRepo     *personRepository
	assignmentRepo *assignmentRepository
	paymentRepo    *paymentRepository
}

func (r *billRepository) Create(_ context.Context, bill *domain.Bill) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if bill.ID == "" {
		bill.ID = uuid.New().String()
	}
	now := time.Now()
	bill.CreatedAt = now
	bill.UpdatedAt = now
	r.bills[bill.ID] = bill
	return nil
}

func (r *billRepository) GetByID(_ context.Context, id string) (domain.Bill, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	b, ok := r.bills[id]
	if !ok {
		return domain.Bill{}, domain.ErrNotFound
	}
	return *b, nil
}

func (r *billRepository) GetByUserID(_ context.Context, userID string, page, limit int, fromDate, toDate string) ([]domain.Bill, int, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	var filtered []domain.Bill
	for _, b := range r.bills {
		if b.UserID != userID {
			continue
		}
		if fromDate != "" {
			fd, err := time.Parse("2006-01-02", fromDate)
			if err == nil && b.CreatedAt.Before(fd) {
				continue
			}
		}
		if toDate != "" {
			td, err := time.Parse("2006-01-02", toDate)
			if err == nil && b.CreatedAt.After(td.Add(24*time.Hour)) {
				continue
			}
		}
		filtered = append(filtered, *b)
	}

	sort.Slice(filtered, func(i, j int) bool {
		return filtered[i].CreatedAt.After(filtered[j].CreatedAt)
	})

	total := len(filtered)
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}
	start := (page - 1) * limit
	if start >= total {
		return []domain.Bill{}, total, nil
	}
	end := start + limit
	if end > total {
		end = total
	}
	return filtered[start:end], total, nil
}

func (r *billRepository) GetByUserIDAndID(_ context.Context, userID, billID string) (domain.Bill, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	b, ok := r.bills[billID]
	if !ok || b.UserID != userID {
		return domain.Bill{}, domain.ErrNotFound
	}
	return *b, nil
}

func (r *billRepository) Update(_ context.Context, bill *domain.Bill) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	_, ok := r.bills[bill.ID]
	if !ok {
		return domain.ErrNotFound
	}
	bill.UpdatedAt = time.Now()
	r.bills[bill.ID] = bill
	return nil
}

func (r *billRepository) Delete(_ context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.bills, id)
	return nil
}

func (r *billRepository) CreateFull(ctx context.Context, bill *domain.Bill, items []domain.Item, persons []domain.Person, assignments []domain.ItemAssignment) error {
	if err := r.Create(ctx, bill); err != nil {
		return err
	}
	for i := range items {
		items[i].BillID = bill.ID
		if err := r.itemRepo.Create(ctx, &items[i]); err != nil {
			return err
		}
	}
	for i := range persons {
		persons[i].BillID = bill.ID
		if err := r.personRepo.Create(ctx, &persons[i]); err != nil {
			return err
		}
	}
	for i := range assignments {
		if err := r.assignmentRepo.Create(ctx, &assignments[i]); err != nil {
			return err
		}
	}
	return nil
}

func (r *billRepository) CreatePayments(ctx context.Context, billID string, payments []domain.Payment) error {
	for i := range payments {
		payments[i].BillID = billID
		if err := r.paymentRepo.Create(ctx, &payments[i]); err != nil {
			return err
		}
	}
	return nil
}

// ---- Item Repository ----

type itemRepository struct {
	mu             sync.Mutex
	items          map[string]*domain.Item
	assignmentRepo *assignmentRepository
}

func (r *itemRepository) Create(_ context.Context, item *domain.Item) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if item.ID == "" {
		item.ID = uuid.New().String()
	}
	item.CreatedAt = time.Now()
	r.items[item.ID] = item
	r.assignmentRepo.TrackItemBill(item.ID, item.BillID)
	return nil
}

func (r *itemRepository) GetByBillID(_ context.Context, billID string) ([]domain.Item, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	var result []domain.Item
	for _, item := range r.items {
		if item.BillID == billID {
			result = append(result, *item)
		}
	}
	return result, nil
}

func (r *itemRepository) Update(_ context.Context, item *domain.Item) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.items[item.ID] = item
	return nil
}

func (r *itemRepository) Delete(_ context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.items, id)
	return nil
}

func (r *itemRepository) DeleteByBillID(_ context.Context, billID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	for id, item := range r.items {
		if item.BillID == billID {
			delete(r.items, id)
		}
	}
	return nil
}

// ---- Person Repository ----

type personRepository struct {
	mu      sync.Mutex
	persons map[string]*domain.Person
}

func (r *personRepository) Create(_ context.Context, person *domain.Person) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if person.ID == "" {
		person.ID = uuid.New().String()
	}
	person.CreatedAt = time.Now()
	r.persons[person.ID] = person
	return nil
}

func (r *personRepository) GetByBillID(_ context.Context, billID string) ([]domain.Person, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	var result []domain.Person
	for _, p := range r.persons {
		if p.BillID == billID {
			result = append(result, *p)
		}
	}
	return result, nil
}

func (r *personRepository) Update(_ context.Context, person *domain.Person) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.persons[person.ID] = person
	return nil
}

func (r *personRepository) Delete(_ context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.persons, id)
	return nil
}

func (r *personRepository) DeleteByBillID(_ context.Context, billID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	for id, p := range r.persons {
		if p.BillID == billID {
			delete(r.persons, id)
		}
	}
	return nil
}

// ---- Assignment Repository ----
// Tracks item_id -> bill_id mapping since the postgres version uses a JOIN with items table.

type assignmentRepository struct {
	mu          sync.Mutex
	assignments map[string]*domain.ItemAssignment
	itemBills   map[string]string // itemID -> billID
}

func (r *assignmentRepository) TrackItemBill(itemID, billID string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.itemBills[itemID] = billID
}

func (r *assignmentRepository) Create(_ context.Context, a *domain.ItemAssignment) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if a.ID == "" {
		a.ID = uuid.New().String()
	}
	a.CreatedAt = time.Now()
	r.assignments[a.ID] = a
	return nil
}

func (r *assignmentRepository) GetByBillID(ctx context.Context, billID string) ([]domain.ItemAssignment, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	itemIDs := make(map[string]bool)
	for itemID, bid := range r.itemBills {
		if bid == billID {
			itemIDs[itemID] = true
		}
	}
	var result []domain.ItemAssignment
	for _, a := range r.assignments {
		if itemIDs[a.ItemID] {
			result = append(result, *a)
		}
	}
	return result, nil
}

func (r *assignmentRepository) DeleteByBillID(_ context.Context, billID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	itemIDs := make(map[string]bool)
	for itemID, bid := range r.itemBills {
		if bid == billID {
			itemIDs[itemID] = true
			delete(r.itemBills, itemID)
		}
	}
	for id, a := range r.assignments {
		if itemIDs[a.ItemID] {
			delete(r.assignments, id)
		}
	}
	return nil
}

// ---- Payment Repository ----

type paymentRepository struct {
	mu       sync.Mutex
	payments map[string]*domain.Payment
}

func (r *paymentRepository) Create(_ context.Context, payment *domain.Payment) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if payment.ID == "" {
		payment.ID = uuid.New().String()
	}
	payment.CreatedAt = time.Now()
	r.payments[payment.ID] = payment
	return nil
}

func (r *paymentRepository) GetByBillID(_ context.Context, billID string) ([]domain.Payment, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	var result []domain.Payment
	for _, p := range r.payments {
		if p.BillID == billID {
			result = append(result, *p)
		}
	}
	return result, nil
}

func (r *paymentRepository) Update(_ context.Context, payment *domain.Payment) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.payments[payment.ID] = payment
	return nil
}

func (r *paymentRepository) DeleteByBillID(_ context.Context, billID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	for id, p := range r.payments {
		if p.BillID == billID {
			delete(r.payments, id)
		}
	}
	return nil
}

// ---- Share Repository ----

type shareRepository struct {
	mu     sync.Mutex
	shares map[string]*domain.Share
}

func (r *shareRepository) Create(_ context.Context, share *domain.Share) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if share.ID == "" {
		share.ID = uuid.New().String()
	}
	if share.ShareToken == "" {
		share.ShareToken = uuid.New().String()
	}
	share.CreatedAt = time.Now()
	r.shares[share.ShareToken] = share
	return nil
}

func (r *shareRepository) GetByShareToken(_ context.Context, token string) (domain.Share, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	s, ok := r.shares[token]
	if !ok {
		return domain.Share{}, domain.ErrNotFound
	}
	return *s, nil
}

func (r *shareRepository) IncrementViews(_ context.Context, token string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	s, ok := r.shares[token]
	if !ok {
		return domain.ErrNotFound
	}
	s.CurrentViews++
	return nil
}

func (r *shareRepository) Delete(_ context.Context, token string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.shares, token)
	return nil
}

// ---- Usage Repository ----

type usageRepository struct {
	mu    sync.Mutex
	usage map[string]*domain.UsageTracking
}

func usageKey(userID, action, month string) string {
	return userID + ":" + action + ":" + month
}

func (r *usageRepository) GetMonthlyUsage(_ context.Context, userID, action, month string) (domain.UsageTracking, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	u, ok := r.usage[usageKey(userID, action, month)]
	if !ok {
		return domain.UsageTracking{}, nil
	}
	return *u, nil
}

func (r *usageRepository) IncrementUsage(_ context.Context, userID, action, month string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	key := usageKey(userID, action, month)
	u, ok := r.usage[key]
	if ok {
		u.Count++
	} else {
		r.usage[key] = &domain.UsageTracking{
			ID:        uuid.New().String(),
			UserID:    userID,
			Action:    action,
			Count:     1,
			Month:     month,
			CreatedAt: time.Now(),
		}
	}
	return nil
}

func (r *usageRepository) ResetMonthlyUsage(_ context.Context, userID, action, month string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	key := usageKey(userID, action, month)
	delete(r.usage, key)
	return nil
}
