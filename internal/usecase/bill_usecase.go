package usecase

import (
	"context"
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

	if req.SplitType == string(domain.SplitTypeCustom) || req.SplitType == string(domain.SplitTypePercentage) {
		if !isPremium {
			return nil, domain.ErrPremiumRequired
		}
	}

	now := time.Now()
	bill := &domain.Bill{
		ID:            "",
		UserID:        userID,
		Title:         req.Title,
		TotalAmount:   0,
		ServiceCharge: req.ServiceCharge,
		Tax:           req.Tax,
		SplitType:     req.SplitType,
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	items := make([]domain.Item, len(req.Items))
	for i, itemReq := range req.Items {
		items[i] = domain.Item{
			BillID:    bill.ID,
			Name:      itemReq.Name,
			Price:     itemReq.Price,
			CreatedAt: now,
		}
		bill.TotalAmount += itemReq.Price
	}

	persons := make([]domain.Person, len(req.Persons))
	for i, personReq := range req.Persons {
		persons[i] = domain.Person{
			BillID:     bill.ID,
			Name:       personReq.Name,
			IsPayer:    personReq.IsPayer,
			Percentage: personReq.Percentage,
			CreatedAt:  now,
		}
	}

	assignments := make([]domain.ItemAssignment, 0)
	if req.SplitType == string(domain.SplitTypeCustom) {
		for _, assignment := range req.Assignments {
			assignments = append(assignments, domain.ItemAssignment{
				ItemID:    assignment.ItemID,
				PersonID:  assignment.PersonID,
				CreatedAt: now,
			})
		}
	}

	if err := bu.billRepo.CreateFull(ctx, bill, items, persons, assignments); err != nil {
		return nil, err
	}

	bill.Items = items
	bill.Persons = persons

	payments := bu.calculatePayments(ctx, bill)
	if err := bu.billRepo.CreatePayments(ctx, bill.ID, payments); err != nil {
		return nil, err
	}
	bill.Payments = payments

	bill.GrandTotal = bill.CalculateGrandTotal()
	bu.billRepo.Update(ctx, bill)

	bu.usageRepo.IncrementUsage(ctx, userID, "create_bill", now.Format("2006-01"))

	return bill, nil
}

func (bu *billUsecase) calculatePayments(ctx context.Context, bill *domain.Bill) []domain.Payment {
	switch bill.SplitType {
	case string(domain.SplitTypeEqual):
		return bu.calculateEqualSplit(ctx, bill)
	case string(domain.SplitTypeCustom):
		return bu.calculateCustomSplit(ctx, bill)
	case string(domain.SplitTypePercentage):
		return bu.calculatePercentageSplit(ctx, bill)
	case string(domain.SplitTypeSharedItems):
		return bu.calculateSharedItemsSplit(ctx, bill)
	}
	return nil
}

func (bu *billUsecase) calculateEqualSplit(ctx context.Context, bill *domain.Bill) []domain.Payment {
	if len(bill.Persons) == 0 {
		return nil
	}

	grandTotal := bill.CalculateGrandTotal()
	perPerson := grandTotal / float64(len(bill.Persons))

	var payments []domain.Payment
	for i, fromPerson := range bill.Persons {
		for j, toPerson := range bill.Persons {
			if i == j {
				continue
			}
			payments = append(payments, domain.Payment{
				BillID:       bill.ID,
				FromPersonID: fromPerson.ID,
				ToPersonID:   toPerson.ID,
				FromPerson:   fromPerson.Name,
				ToPerson:     toPerson.Name,
				Amount:       perPerson,
				IsPaid:       false,
				CreatedAt:    time.Now(),
			})
		}
	}
	return payments
}

func (bu *billUsecase) calculateCustomSplit(ctx context.Context, bill *domain.Bill) []domain.Payment {
	var payments []domain.Payment
	assignments, err := bu.assignmentRepo.GetByBillID(ctx, bill.ID)
	if err != nil {
		log.Printf("failed to get assignments for custom split: %v", err)
	}
	items, err := bu.itemRepo.GetByBillID(ctx, bill.ID)
	if err != nil {
		log.Printf("failed to get items for custom split: %v", err)
	}

	itemPersonMap := make(map[string][]string)
	for _, a := range assignments {
		itemPersonMap[a.ItemID] = append(itemPersonMap[a.ItemID], a.PersonID)
	}

	personAmounts := make(map[string]float64)
	for _, item := range items {
		persons := itemPersonMap[item.ID]
		if len(persons) == 0 {
			continue
		}
		splitAmount := item.Price / float64(len(persons))
		for _, personID := range persons {
			personAmounts[personID] += splitAmount
		}
	}

	serviceCharge := bill.TotalAmount * bill.ServiceCharge / 100
	tax := bill.TotalAmount * bill.Tax / 100
	additionalCost := serviceCharge + tax

	toPerson := findPayer(bill.Persons)

	for personID, amount := range personAmounts {
		proportion := amount / bill.TotalAmount
		personShare := additionalCost * proportion

		personName := ""
		for _, p := range bill.Persons {
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

func (bu *billUsecase) calculatePercentageSplit(ctx context.Context, bill *domain.Bill) []domain.Payment {
	grandTotal := bill.CalculateGrandTotal()
	toPerson := findPayer(bill.Persons)

	var payments []domain.Payment
	for _, person := range bill.Persons {
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

func (bu *billUsecase) calculateSharedItemsSplit(ctx context.Context, bill *domain.Bill) []domain.Payment {
	var payments []domain.Payment
	if len(bill.Persons) == 0 || len(bill.Items) == 0 {
		return nil
	}

	assignments, err := bu.assignmentRepo.GetByBillID(ctx, bill.ID)
	if err != nil {
		log.Printf("failed to get assignments for shared items split: %v", err)
	}
	items, err := bu.itemRepo.GetByBillID(ctx, bill.ID)
	if err != nil {
		log.Printf("failed to get items for shared items split: %v", err)
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

	sharedPerPerson := sharedItemTotal / float64(len(bill.Persons))

	serviceCharge := bill.TotalAmount * bill.ServiceCharge / 100
	tax := bill.TotalAmount * bill.Tax / 100
	additionalCost := serviceCharge + tax

	totalAssigned := 0.0
	for _, amount := range individualItemTotals {
		totalAssigned += amount
	}
	totalAssigned += sharedItemTotal

	toPerson := findPayer(bill.Persons)

	for _, person := range bill.Persons {
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
	for i, bill := range bills {
		persons, _ := bu.personRepo.GetByBillID(ctx, bill.ID)
		grandTotal := bill.CalculateGrandTotal()

		summaries[i] = domain.BillSummary{
			ID:          bill.ID,
			Title:       bill.Title,
			GrandTotal:  grandTotal,
			PersonCount: len(persons),
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

	if err := bu.assignmentRepo.DeleteByBillID(ctx, billID); err != nil {
		return fmt.Errorf("delete assignments: %w", err)
	}
	if err := bu.paymentRepo.DeleteByBillID(ctx, billID); err != nil {
		return fmt.Errorf("delete payments: %w", err)
	}
	if err := bu.itemRepo.DeleteByBillID(ctx, billID); err != nil {
		return fmt.Errorf("delete items: %w", err)
	}
	if err := bu.personRepo.DeleteByBillID(ctx, billID); err != nil {
		return fmt.Errorf("delete persons: %w", err)
	}

	return bu.billRepo.Delete(ctx, billID)
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
	usage, err := bu.usageRepo.GetMonthlyUsage(ctx, userID, "create_bill", month)
	if err != nil {
		return nil, err
	}
	return &domain.UsageResponse{
		Current: usage.Count,
		Limit:   bu.usageLimit,
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