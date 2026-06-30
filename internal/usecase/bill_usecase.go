package usecase

import (
	"context"
	"fmt"
	"log"
	"math"
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
		ocrService:     ocrService,
		contextTimeout: timeout,
		usageLimit:     usageLimit,
	}
}

func (bu *billUsecase) Create(ctx context.Context, userID string, req *domain.CreateBillRequest) (*domain.Bill, error) {
	ctx, cancel := context.WithTimeout(ctx, bu.contextTimeout)
	defer cancel()

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

	if req.SplitType == string(domain.SplitTypePercentage) {
		totalPct := 0.0
		for _, p := range req.Persons {
			totalPct += p.Percentage
		}
		if totalPct < 99.9 || totalPct > 100.1 {
			return nil, fmt.Errorf("percentages must sum to 100 (got %.1f%%)", totalPct)
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
		if qty < 1 {
			qty = 1
		}
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
			ID:          personReq.ID,
			BillID:      bill.ID,
			Name:        personReq.Name,
			IsPayer:     personReq.IsPayer,
			Percentage:  personReq.Percentage,
			PaymentInfo: pi,
			CreatedAt:   now,
		}
	}

	for i, p := range persons {
		if p.IsPayer {
			uid := user.ID
			persons[i].UserID = &uid
		}
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

	if err := bu.billRepo.CreateFull(ctx, bill, items, persons, assignments); err != nil {
		return nil, err
	}

	bill.Items = items
	bill.Persons = persons

	payments := bu.calculatePayments(ctx, bill, items, persons, assignments)
	for _, p := range persons {
		if p.IsPayer {
			continue
		}
		hasPayment := false
		for _, pm := range payments {
			if pm.FromPersonID == p.ID && pm.Amount > 0 {
				hasPayment = true
				break
			}
		}
		if !hasPayment {
			return nil, fmt.Errorf("%s has no payment to settle — assign items or change split type", p.Name)
		}
	}
	if err := bu.billRepo.CreatePayments(ctx, bill.ID, payments); err != nil {
		return nil, err
	}
	bill.Payments = payments

	bu.usageRepo.IncrementUsage(ctx, userID, "create_bill", month)

	return bill, nil
}

func (bu *billUsecase) calculatePayments(ctx context.Context, bill *domain.Bill, items []domain.Item, persons []domain.Person, assignments []domain.ItemAssignment) []domain.Payment {
	switch bill.SplitType {
	case string(domain.SplitTypeEqual):
		return bu.calculateEqualSplit(ctx, bill, persons)
	case string(domain.SplitTypeCustom):
		return bu.calculateCustomSplit(ctx, bill, items, persons, assignments)
	case string(domain.SplitTypePercentage):
		return bu.calculatePercentageSplit(ctx, bill, persons)
	case string(domain.SplitTypeSharedItems):
		return bu.calculateSharedItemsSplit(ctx, bill, items, persons, assignments)
	}
	return nil
}

func (bu *billUsecase) calculateEqualSplit(ctx context.Context, bill *domain.Bill, persons []domain.Person) []domain.Payment {
	if len(persons) == 0 {
		return nil
	}

	grandTotal := bill.CalculateGrandTotal()
	raw := grandTotal / float64(len(persons))
	perPerson := math.Floor(raw*100) / 100
	remainder := math.Round((grandTotal-perPerson*float64(len(persons)-1))*100) / 100
	toPerson := findPayer(persons)

	var payments []domain.Payment
	for i, fromPerson := range persons {
		if fromPerson.ID == toPerson.ID {
			continue
		}
		amount := perPerson
		if i == 0 {
			amount = remainder
		}
		payments = append(payments, domain.Payment{
			BillID:       bill.ID,
			FromPersonID: fromPerson.ID,
			ToPersonID:   toPerson.ID,
			FromPerson:   fromPerson.Name,
			ToPerson:     toPerson.Name,
			Amount:       amount,
			IsPaid:       false,
			CreatedAt:    time.Now(),
		})
	}
	return payments
}

func (bu *billUsecase) calculateCustomSplit(ctx context.Context, bill *domain.Bill, items []domain.Item, persons []domain.Person, assignments []domain.ItemAssignment) []domain.Payment {
	var payments []domain.Payment

	itemPersonMap := make(map[string][]string)
	for _, a := range assignments {
		itemPersonMap[a.ItemID] = append(itemPersonMap[a.ItemID], a.PersonID)
	}

	personAmounts := make(map[string]float64)
	for _, item := range items {
		assigned := itemPersonMap[item.ID]
		if len(assigned) == 0 {
			continue
		}
		splitAmount := item.Price / float64(len(assigned))
		for _, personID := range assigned {
			personAmounts[personID] += splitAmount
		}
	}

	svc := bill.ServiceCharge
	if bill.ServiceMode == "percent" {
		svc = bill.TotalAmount * bill.ServiceCharge / 100
	}
	tax := bill.Tax
	if bill.TaxMode == "percent" {
		tax = bill.TotalAmount * bill.Tax / 100
	}
	additionalCost := svc + tax

	toPerson := findPayer(persons)

	for personID, amount := range personAmounts {
		if personID == toPerson.ID {
			continue
		}
		proportion := float64(0)
		if bill.TotalAmount > 0 {
			proportion = amount / bill.TotalAmount
		}
		personShare := additionalCost * proportion

		personName := ""
		for _, p := range persons {
			if p.ID == personID {
				personName = p.Name
				break
			}
		}

		payments = append(payments, domain.Payment{
			BillID:       bill.ID,
			FromPersonID: personID,
			ToPersonID:   toPerson.ID,
			FromPerson:   personName,
			ToPerson:     toPerson.Name,
			Amount:       amount + personShare,
			IsPaid:       false,
			CreatedAt:    time.Now(),
		})
	}
	return payments
}

func (bu *billUsecase) calculatePercentageSplit(ctx context.Context, bill *domain.Bill, persons []domain.Person) []domain.Payment {
	grandTotal := bill.CalculateGrandTotal()
	toPerson := findPayer(persons)

	var payments []domain.Payment
	for _, person := range persons {
		if person.ID == toPerson.ID {
			continue
		}
		personAmount := grandTotal * person.Percentage / 100

		payments = append(payments, domain.Payment{
			BillID:       bill.ID,
			FromPersonID: person.ID,
			ToPersonID:   toPerson.ID,
			FromPerson:   person.Name,
			ToPerson:     toPerson.Name,
			Amount:       personAmount,
			IsPaid:       false,
			CreatedAt:    time.Now(),
		})
	}
	return payments
}

func (bu *billUsecase) calculateSharedItemsSplit(ctx context.Context, bill *domain.Bill, items []domain.Item, persons []domain.Person, assignments []domain.ItemAssignment) []domain.Payment {
	var payments []domain.Payment
	if len(persons) == 0 || len(items) == 0 {
		return nil
	}

	itemPersonMap := make(map[string][]string)
	for _, a := range assignments {
		itemPersonMap[a.ItemID] = append(itemPersonMap[a.ItemID], a.PersonID)
	}

	sharedItemTotal := 0.0
	individualItemTotals := make(map[string]float64)

	for _, item := range items {
		persons := itemPersonMap[item.ID]
		if len(persons) == 0 {
			sharedItemTotal += item.Price
		} else {
			splitAmount := item.Price / float64(len(persons))
			for _, personID := range persons {
				individualItemTotals[personID] += splitAmount
			}
		}
	}

	sharedPerPerson := sharedItemTotal / float64(len(persons))

	svc := bill.ServiceCharge
	if bill.ServiceMode == "percent" {
		svc = bill.TotalAmount * bill.ServiceCharge / 100
	}
	tax := bill.Tax
	if bill.TaxMode == "percent" {
		tax = bill.TotalAmount * bill.Tax / 100
	}
	additionalCost := svc + tax

	totalAssigned := 0.0
	for _, amount := range individualItemTotals {
		totalAssigned += amount
	}
	totalAssigned += sharedItemTotal

	toPerson := findPayer(persons)

	for _, person := range persons {
		if person.ID == toPerson.ID {
			continue
		}
		individualShare := individualItemTotals[person.ID]
		sharedShare := sharedPerPerson
		subtotal := individualShare + sharedShare

		proportion := 0.0
		if totalAssigned > 0 {
			proportion = subtotal / totalAssigned
		}
		personExtraCost := additionalCost * proportion

		totalPayment := subtotal + personExtraCost

		payments = append(payments, domain.Payment{
			BillID:       bill.ID,
			FromPersonID: person.ID,
			ToPersonID:   toPerson.ID,
			FromPerson:   person.Name,
			ToPerson:     toPerson.Name,
			Amount:       totalPayment,
			IsPaid:       false,
			CreatedAt:    time.Now(),
		})
	}
	return payments
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
		log.Printf("failed to fetch items for bill %s: %v", billID, err)
	}
	persons, err := bu.personRepo.GetByBillID(ctx, billID)
	if err != nil {
		log.Printf("failed to fetch persons for bill %s: %v", billID, err)
	}
	payments, err := bu.paymentRepo.GetByBillID(ctx, billID)
	if err != nil {
		log.Printf("failed to fetch payments for bill %s: %v", billID, err)
	}
	assignments, err := bu.assignmentRepo.GetByBillID(ctx, billID)
	if err != nil {
		log.Printf("failed to fetch assignments for bill %s: %v", billID, err)
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
	}

	for i := range payments {
		for _, p := range persons {
			if payments[i].FromPersonID == p.ID {
				payments[i].FromPerson = p.Name
			}
		}
	}

	bill.Items = items
	bill.Persons = persons
	bill.Payments = payments
	bill.GrandTotal = bill.CalculateGrandTotal()

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
			Page:        page,
			Limit:       limit,
			TotalItems:  total,
			TotalPages:  totalPages,
		},
	}, nil
}

func (bu *billUsecase) Delete(ctx context.Context, userID, billID string) error {
	ctx, cancel := context.WithTimeout(ctx, bu.contextTimeout)
	defer cancel()

	_, err := bu.billRepo.GetByUserIDAndID(ctx, userID, billID)
	if err != nil {
		return err
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
	if !valid[status] {
		return fmt.Errorf("invalid status: %s", status)
	}

	bill.Status = status
	return bu.billRepo.Update(ctx, &bill)
}

func (bu *billUsecase) MarkPersonPaid(ctx context.Context, userID, billID, personID string) (*domain.Bill, error) {
	ctx, cancel := context.WithTimeout(ctx, bu.contextTimeout)
	defer cancel()

	_, err := bu.billRepo.GetByUserIDAndID(ctx, userID, billID)
	if err != nil {
		return nil, err
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