package usecase

import (
	"context"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/user/split-mate/internal/domain"
)

type billUsecase struct {
	billRepo       domain.BillRepository
	itemRepo       domain.ItemRepository
	personRepo     domain.PersonRepository
	assignmentRepo domain.AssignmentRepository
	paymentRepo    domain.PaymentRepository
	usageRepo      domain.UsageRepository
	userRepo       domain.UserRepository
	contactRepo    domain.ContactRepository
	ocrService     domain.OCRService
	contextTimeout time.Duration
	usageLimit     int
}

func NewBillUsecase(
	billRepo domain.BillRepository,
	itemRepo domain.ItemRepository,
	personRepo domain.PersonRepository,
	assignmentRepo domain.AssignmentRepository,
	paymentRepo domain.PaymentRepository,
	usageRepo domain.UsageRepository,
	userRepo domain.UserRepository,
	contactRepo domain.ContactRepository,
	ocrService domain.OCRService,
	timeout time.Duration,
	usageLimit int,
) BillUsecase {
	return &billUsecase{
		billRepo:       billRepo,
		itemRepo:       itemRepo,
		personRepo:     personRepo,
		assignmentRepo: assignmentRepo,
		paymentRepo:    paymentRepo,
		usageRepo:      usageRepo,
		userRepo:       userRepo,
		contactRepo:    contactRepo,
		ocrService:     ocrService,
		contextTimeout: timeout,
		usageLimit:     usageLimit,
	}
}

func (bu *billUsecase) Create(ctx context.Context, userID string, req *domain.CreateBillRequest) (*domain.Bill, error) {
	ctx, cancel := context.WithTimeout(ctx, bu.contextTimeout)
	defer cancel()

	if req.Status != "" && req.Status != "pending" && req.Status != "completed" && req.Status != "draft" {
		return nil, fmt.Errorf("%w: invalid status", domain.ErrInvalidInput)
	}
	if _, err := time.Parse("2006-01-02", req.BillDate); err != nil {
		return nil, fmt.Errorf("%w: invalid bill date", domain.ErrInvalidInput)
	}
	encoded, _ := json.Marshal(req)
	hash := fmt.Sprintf("%x", sha256.Sum256(encoded))
	if previous, err := bu.billRepo.FindRequest(ctx, userID, req.RequestKey, hash); err != nil || previous != nil {
		return previous, err
	}
	contacts, err := bu.contactRepo.GetByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	user, err := bu.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	isPremium := user.Tier == "premium" && user.PremiumExpiresAt != nil && user.PremiumExpiresAt.After(time.Now())
	if !isPremium && user.Tier == "premium" {
		if err := bu.userRepo.UpdateTier(ctx, user.ID, "free", nil); err != nil {
			log.Printf("failed to downgrade expired premium for user %s: %v", user.ID, err)
		}
	}

	if req.SplitType == string(domain.SplitTypeCustom) || req.SplitType == string(domain.SplitTypePercentage) || req.SplitType == string(domain.SplitTypeSharedItems) {
		if !isPremium {
			return nil, domain.ErrPremiumRequired
		}
	}

	if req.SplitType == string(domain.SplitTypePercentage) && req.Status != "draft" {
		totalPct := 0.0
		for _, p := range req.Persons {
			totalPct += p.Percentage
		}
		if totalPct < 99.9 || totalPct > 100.1 {
			return nil, fmt.Errorf("%w: percentages must sum to 100 (got %.1f%%)", domain.ErrInvalidInput, totalPct)
		}
	}

	// Check usage limit from DB tier_limits table
	now := time.Now()
	month := now.Format("2006-01")
	tierName := "free"
	if isPremium {
		tierName = "premium"
	}
	tierLimit, err := bu.usageRepo.GetTierLimit(ctx, tierName)
	if err != nil {
		log.Printf("failed to get tier limit: %v", err)
		return nil, err
	}
	if tierLimit.MonthlyBillLimit >= 0 {
		usage, err := bu.usageRepo.GetMonthlyUsage(ctx, userID, "create_bill", month)
		if err != nil {
			return nil, err
		}
		if usage.Count >= tierLimit.MonthlyBillLimit {
			return nil, domain.ErrBillLimitExceeded
		}
	}

	status := req.Status
	if status == "" {
		status = "pending"
	}
	serviceMode := req.ServiceMode
	if serviceMode == "" {
		serviceMode = "percent"
	}
	taxMode := req.TaxMode
	if taxMode == "" {
		taxMode = "percent"
	}

	bill := &domain.Bill{
		RequestKey: req.RequestKey, RequestHash: hash,
		ID:            "",
		UserID:        userID,
		Title:         req.Title,
		Merchant:      req.Merchant,
		TotalAmount:   0,
		ServiceCharge: req.ServiceCharge,
		ServiceMode:   serviceMode,
		Tax:           req.Tax,
		TaxMode:       taxMode,
		Discount:      req.Discount,
		Status:        status,
		SplitType:     req.SplitType,
		BillDate:      req.BillDate,
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	items := make([]domain.Item, len(req.Items))
	for i, itemReq := range req.Items {
		qty := itemReq.Quantity
		items[i] = domain.Item{
			ID:        itemReq.ID,
			BillID:    bill.ID,
			Name:      itemReq.Name,
			Price:     itemReq.Price,
			Quantity:  qty,
			CreatedAt: now,
		}
		bill.TotalAmount += itemReq.Price * float64(qty)
	}

	persons := make([]domain.Person, len(req.Persons))
	for i, personReq := range req.Persons {
		pi := personReq.PaymentInfo
		if pi == nil {
			pi = map[string]interface{}{}
		}
		persons[i] = domain.Person{
			CustomAmount: personReq.CustomAmount,
			ID:           personReq.ID,
			BillID:       bill.ID,
			Name:         personReq.Name,
			Email:        personReq.Email,
			IsPayer:      personReq.IsPayer,
			Percentage:   personReq.Percentage,
			PaymentInfo:  pi,
			CreatedAt:    now,
		}
	}

	linked := map[string]bool{}
	for i, p := range req.Persons {
		if p.UserID == "" {
			continue
		}
		allowed := p.UserID == userID
		for _, c := range contacts {
			if c.ConnectedUserID == p.UserID {
				allowed = true
			}
		}
		if !allowed || linked[p.UserID] {
			return nil, fmt.Errorf("%w: invalid or duplicate linked friend", domain.ErrInvalidInput)
		}
		account, err := bu.userRepo.GetByID(ctx, p.UserID)
		if err != nil {
			return nil, err
		}
		persons[i].UserID = &account.ID
		persons[i].Name = account.Name
		persons[i].Email = account.Email
		linked[p.UserID] = true
	}

	assignments := make([]domain.ItemAssignment, 0)
	for _, a := range req.Assignments {
		assignments = append(assignments, domain.ItemAssignment{
			ItemID:    a.ItemID,
			PersonID:  a.PersonID,
			CreatedAt: now,
		})
	}

	bill.GrandTotal = bill.CalculateGrandTotal()

	bill.Items = items
	bill.Persons = persons
	if req.Status == "draft" {
		validationBill := *bill
		validationBill.SplitType = "equal"
		if _, err := domain.CalculateShares(validationBill, items, persons, assignments); err != nil {
			return nil, err
		}
	}

	if req.Status != "draft" {
		shares, err := domain.CalculateShares(*bill, items, persons, assignments)
		if err != nil {
			return nil, err
		}
		payer := findPayer(persons)
		for i, p := range persons {
			persons[i].ShareAmount = &shares[i]
			if p.ID != payer.ID && shares[i] > 0 {
				bill.Payments = append(bill.Payments, domain.Payment{FromPersonID: p.ID, ToPersonID: payer.ID, FromPerson: p.Name, ToPerson: payer.Name, Amount: shares[i], CreatedAt: now})
			}
		}
		bill.Status = "pending"
		if len(bill.Payments) == 0 {
			bill.Status = "completed"
		}
	}
	if err := bu.billRepo.CreateFull(ctx, bill, items, persons, assignments); err != nil {
		return nil, err
	}

	return bill, nil
}

func (bu *billUsecase) GetByID(ctx context.Context, userID, billID string) (*domain.BillDetailResponse, error) {
	ctx, cancel := context.WithTimeout(ctx, bu.contextTimeout)
	defer cancel()

	bill, err := bu.billRepo.GetByUserIDAndID(ctx, userID, billID)
	if err != nil {
		return nil, err
	}

	items, err := bu.itemRepo.GetByBillID(ctx, billID)
	if err != nil {
		return nil, err
	}
	persons, err := bu.personRepo.GetByBillID(ctx, billID)
	if err != nil {
		return nil, err
	}
	payments, err := bu.paymentRepo.GetByBillID(ctx, billID)
	if err != nil {
		return nil, err
	}
	assignments, err := bu.assignmentRepo.GetByBillID(ctx, billID)
	if err != nil {
		return nil, err
	}

	itemPersonMap := make(map[string][]string)
	for _, a := range assignments {
		for _, p := range persons {
			if a.PersonID == p.ID {
				itemPersonMap[a.ItemID] = append(itemPersonMap[a.ItemID], p.Name)
			}
		}
	}

	for i := range items {
		items[i].AssignedTo = itemPersonMap[items[i].ID]
		for _, a := range assignments {
			if a.ItemID == items[i].ID {
				items[i].AssignedPersonIDs = append(items[i].AssignedPersonIDs, a.PersonID)
			}
		}
	}

	for i := range payments {
		for _, p := range persons {
			if payments[i].FromPersonID == p.ID {
				payments[i].FromPerson = p.Name
			}
			if payments[i].ToPersonID == p.ID {
				payments[i].ToPerson = p.Name
			}
		}
	}

	bill.Items = items
	bill.Persons = persons
	bill.Payments = payments

	settlement := bu.calculateSettlement(payments)

	return &domain.BillDetailResponse{
		Bill:              bill,
		SettlementSummary: settlement,
	}, nil
}

func (bu *billUsecase) calculateSettlement(payments []domain.Payment) map[string]float64 {
	balances := make(map[string]float64)

	for _, p := range payments {
		if !p.IsPaid {
			balances[p.FromPerson] -= p.Amount
			balances[p.ToPerson] += p.Amount
		}
	}

	settlement := make(map[string]float64)
	for name, balance := range balances {
		if balance < 0 {
			settlement[name+" owes"] = -balance
		}
	}

	return settlement
}

func (bu *billUsecase) Fetch(ctx context.Context, userID string, page, limit int, fromDate, toDate string) (*domain.BillListResponse, error) {
	ctx, cancel := context.WithTimeout(ctx, bu.contextTimeout)
	defer cancel()

	bills, total, err := bu.billRepo.GetByUserID(ctx, userID, page, limit, fromDate, toDate)
	if err != nil {
		return nil, err
	}

	summaries := make([]domain.BillSummary, len(bills))

	billIDs := make([]string, len(bills))
	for i, bill := range bills {
		billIDs[i] = bill.ID
	}

	paymentSummaries := map[string]domain.UserPaymentSummary{}
	if len(billIDs) > 0 {
		if ps, err := bu.paymentRepo.GetUserPaymentSummaryByBillIDs(ctx, billIDs, userID); err == nil {
			paymentSummaries = ps
		}
	}

	for i, bill := range bills {
		persons, _ := bu.personRepo.GetByBillID(ctx, bill.ID)

		payerName := ""
		for _, p := range persons {
			if p.IsPayer {
				payerName = p.Name
				break
			}
		}

		ps := paymentSummaries[bill.ID]

		userShare := ps.UserShare
		if userShare < 0 {
			userShare = bill.GrandTotal + userShare
		}
		if userShare < 0 {
			userShare = 0
		}

		summaries[i] = domain.BillSummary{
			ID:          bill.ID,
			Title:       bill.Title,
			Merchant:    bill.Merchant,
			GrandTotal:  bill.GrandTotal,
			UserShare:   userShare,
			Receivable:  ps.Receivable,
			Payable:     ps.Payable,
			PersonCount: len(persons),
			Status:      bill.Status,
			Discount:    bill.Discount,
			PayerName:   payerName,
			BillDate:    bill.BillDate,
			CreatedAt:   bill.CreatedAt,
		}
	}

	totalPages := total / limit
	if total%limit != 0 {
		totalPages++
	}

	return &domain.BillListResponse{
		Data: summaries,
		Pagination: domain.Pagination{
			Page:       page,
			Limit:      limit,
			TotalItems: total,
			TotalPages: totalPages,
		},
	}, nil
}

func (bu *billUsecase) Delete(ctx context.Context, userID, billID string) error {
	ctx, cancel := context.WithTimeout(ctx, bu.contextTimeout)
	defer cancel()

	bill, err := bu.billRepo.GetByUserIDAndID(ctx, userID, billID)
	if err != nil {
		return err
	}

	if bill.UserID != userID {
		return domain.ErrNotFound
	}
	return bu.billRepo.Delete(ctx, billID)
}

func (bu *billUsecase) UpdateStatus(ctx context.Context, userID, billID, status string) error {
	ctx, cancel := context.WithTimeout(ctx, bu.contextTimeout)
	defer cancel()

	bill, err := bu.billRepo.GetByUserIDAndID(ctx, userID, billID)
	if err != nil {
		return err
	}

	valid := map[string]bool{"pending": true, "completed": true, "draft": true}
	if bill.UserID != userID {
		return domain.ErrNotFound
	}
	if status != bill.Status {
		return fmt.Errorf("%w: use per-person settlement; draft finalization creates a new bill", domain.ErrInvalidInput)
	}
	if !valid[status] {
		return fmt.Errorf("invalid status: %s", status)
	}

	bill.Status = status
	return bu.billRepo.Update(ctx, &bill)
}

func (bu *billUsecase) MarkPersonPaid(ctx context.Context, userID, billID, personID string) (*domain.Bill, error) {
	ctx, cancel := context.WithTimeout(ctx, bu.contextTimeout)
	defer cancel()

	owned, err := bu.billRepo.GetByUserIDAndID(ctx, userID, billID)
	if err != nil {
		return nil, err
	}

	if owned.UserID != userID {
		return nil, domain.ErrNotFound
	}
	if _, err := bu.paymentRepo.MarkPersonPaymentsPaid(ctx, billID, personID); err != nil {
		return nil, err
	}

	allPaid, err := bu.paymentRepo.AllPaymentsPaid(ctx, billID)
	if err != nil {
		return nil, err
	}

	if allPaid {
		bill, err := bu.billRepo.GetByID(ctx, billID)
		if err != nil {
			return nil, err
		}
		bill.Status = "completed"
		if err := bu.billRepo.Update(ctx, &bill); err != nil {
			return nil, err
		}
		return &bill, nil
	}

	return nil, nil
}

func (bu *billUsecase) ProcessOCR(ctx context.Context, userID string, imageBytes []byte) (*domain.OCRResult, error) {
	ctx, cancel := context.WithTimeout(ctx, bu.contextTimeout)
	defer cancel()

	result, err := bu.ocrService.ExtractItems(ctx, imageBytes)
	if err != nil {
		return nil, err
	}

	return result, nil
}

func (bu *billUsecase) GetUsage(ctx context.Context, userID string) (*domain.UsageResponse, error) {
	now := time.Now()
	month := now.Format("2006-01")

	user, err := bu.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	tierLimit, err := bu.usageRepo.GetTierLimit(ctx, user.Tier)
	if err != nil {
		log.Printf("failed to get tier limit: %v", err)
		tierLimit = domain.TierLimit{Tier: user.Tier, MonthlyBillLimit: 50, MonthlyOCRLimit: 10}
	}

	usage, err := bu.usageRepo.GetMonthlyUsage(ctx, userID, "create_bill", month)
	if err != nil {
		return nil, err
	}

	limit := tierLimit.MonthlyBillLimit

	return &domain.UsageResponse{
		Current: usage.Count,
		Limit:   limit,
		ResetAt: time.Date(now.Year(), now.Month()+1, 1, 0, 0, 0, 0, now.Location()),
	}, nil
}

func findPayer(persons []domain.Person) domain.Person {
	for _, p := range persons {
		if p.IsPayer {
			return p
		}
	}
	if len(persons) > 0 {
		return persons[0]
	}
	return domain.Person{}
}
