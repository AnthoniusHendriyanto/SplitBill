package usecase

import (
	"context"
	"errors"
	"time"

	"github.com/user/split-mate/internal/domain"
)

var _ domain.BillUsecase = (*billUsecase)(nil)

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
) domain.BillUsecase {
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
	}
}

func (bu *billUsecase) Create(ctx context.Context, userID string, req *domain.CreateBillRequest) (*domain.Bill, error) {
	ctx, cancel := context.WithTimeout(ctx, bu.contextTimeout)
	defer cancel()

	user, err := bu.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	if req.SplitType == string(domain.SplitTypeCustom) || req.SplitType == string(domain.SplitTypePercentage) {
		if user.Tier != "premium" {
			return nil, errors.New("custom and percentage split are premium features")
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

	if err := bu.billRepo.Create(ctx, bill); err != nil {
		return nil, err
	}

	for _, itemReq := range req.Items {
		item := &domain.Item{
			ID:      "",
			BillID:  bill.ID,
			Name:    itemReq.Name,
			Price:   itemReq.Price,
			CreatedAt: now,
		}
		if err := bu.itemRepo.Create(ctx, item); err != nil {
			return nil, err
		}
		bill.Items = append(bill.Items, *item)
		bill.TotalAmount += itemReq.Price
	}

	for _, personReq := range req.Persons {
		person := &domain.Person{
			ID:          "",
			BillID:      bill.ID,
			Name:        personReq.Name,
			IsPayer:     personReq.IsPayer,
			Percentage:  personReq.Percentage,
			CreatedAt:   now,
		}
		if err := bu.personRepo.Create(ctx, person); err != nil {
			return nil, err
		}
		bill.Persons = append(bill.Persons, *person)
	}

	if req.SplitType == string(domain.SplitTypeCustom) {
		for _, assignment := range req.Assignments {
			a := &domain.ItemAssignment{
				ID:        "",
				ItemID:    assignment.ItemID,
				PersonID:  assignment.PersonID,
				CreatedAt: now,
			}
			if err := bu.assignmentRepo.Create(ctx, a); err != nil {
				return nil, err
			}
		}
	}

	bu.calculatePayments(ctx, bill)

	bill.GrandTotal = bill.TotalAmount + (bill.TotalAmount * bill.ServiceCharge / 100) + (bill.TotalAmount * bill.Tax / 100)
	bu.billRepo.Update(ctx, bill)

	return bill, nil
}

func (bu *billUsecase) calculatePayments(ctx context.Context, bill *domain.Bill) {
	switch bill.SplitType {
	case string(domain.SplitTypeEqual):
		bu.calculateEqualSplit(ctx, bill)
	case string(domain.SplitTypeCustom):
		bu.calculateCustomSplit(ctx, bill)
	case string(domain.SplitTypePercentage):
		bu.calculatePercentageSplit(ctx, bill)
	case string(domain.SplitTypeSharedItems):
		bu.calculateSharedItemsSplit(ctx, bill)
	}
}

func (bu *billUsecase) calculateEqualSplit(ctx context.Context, bill *domain.Bill) {
	if len(bill.Persons) == 0 {
		return
	}

	subtotal := bill.TotalAmount
	serviceCharge := subtotal * bill.ServiceCharge / 100
	tax := subtotal * bill.Tax / 100
	grandTotal := subtotal + serviceCharge + tax

	perPerson := grandTotal / float64(len(bill.Persons))

	for i, fromPerson := range bill.Persons {
		for j, toPerson := range bill.Persons {
			if i == j {
				continue
			}
			payment := &domain.Payment{
				ID:            "",
				BillID:        bill.ID,
				FromPersonID:  fromPerson.ID,
				ToPersonID:    toPerson.ID,
				FromPerson:    fromPerson.Name,
				ToPerson:      toPerson.Name,
				Amount:        perPerson,
				IsPaid:        false,
				CreatedAt:     time.Now(),
			}
			bu.paymentRepo.Create(ctx, payment)
			bill.Payments = append(bill.Payments, *payment)
		}
	}
}

func (bu *billUsecase) calculateCustomSplit(ctx context.Context, bill *domain.Bill) {
	assignments, _ := bu.assignmentRepo.GetByBillID(ctx, bill.ID)
	items, _ := bu.itemRepo.GetByBillID(ctx, bill.ID)

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

	for personID, amount := range personAmounts {
		proportion := amount / bill.TotalAmount
		personShare := additionalCost * proportion

		var personName string
		for _, p := range bill.Persons {
			if p.ID == personID {
				personName = p.Name
				break
			}
		}

		payment := &domain.Payment{
			ID:           "",
			BillID:       bill.ID,
			FromPersonID: personID,
			ToPersonID:   "",
			FromPerson:   personName,
			ToPerson:     "Bill",
			Amount:       amount + personShare,
			IsPaid:       false,
			CreatedAt:    time.Now(),
		}
		bu.paymentRepo.Create(ctx, payment)
		bill.Payments = append(bill.Payments, *payment)
	}
}

func (bu *billUsecase) calculatePercentageSplit(ctx context.Context, bill *domain.Bill) {
	subtotal := bill.TotalAmount
	serviceCharge := subtotal * bill.ServiceCharge / 100
	tax := subtotal * bill.Tax / 100
	grandTotal := subtotal + serviceCharge + tax

	for _, person := range bill.Persons {
		personAmount := grandTotal * person.Percentage / 100

		payment := &domain.Payment{
			ID:           "",
			BillID:       bill.ID,
			FromPersonID: person.ID,
			ToPersonID:   "",
			FromPerson:   person.Name,
			ToPerson:     "Bill",
			Amount:       personAmount,
			IsPaid:       false,
			CreatedAt:    time.Now(),
		}
		bu.paymentRepo.Create(ctx, payment)
		bill.Payments = append(bill.Payments, *payment)
	}
}

func (bu *billUsecase) calculateSharedItemsSplit(ctx context.Context, bill *domain.Bill) {
	if len(bill.Persons) == 0 || len(bill.Items) == 0 {
		return
	}

	assignments, _ := bu.assignmentRepo.GetByBillID(ctx, bill.ID)
	items, _ := bu.itemRepo.GetByBillID(ctx, bill.ID)

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

		payment := &domain.Payment{
			ID:           "",
			BillID:       bill.ID,
			FromPersonID: person.ID,
			ToPersonID:   "",
			FromPerson:   person.Name,
			ToPerson:     "Bill",
			Amount:       totalPayment,
			IsPaid:       false,
			CreatedAt:    time.Now(),
		}
		bu.paymentRepo.Create(ctx, payment)
		bill.Payments = append(bill.Payments, *payment)
	}
}

func (bu *billUsecase) GetByID(ctx context.Context, userID, billID string) (*domain.BillDetailResponse, error) {
	ctx, cancel := context.WithTimeout(ctx, bu.contextTimeout)
	defer cancel()

	bill, err := bu.billRepo.GetByUserIDAndID(ctx, userID, billID)
	if err != nil {
		return nil, err
	}

	items, _ := bu.itemRepo.GetByBillID(ctx, billID)
	persons, _ := bu.personRepo.GetByBillID(ctx, billID)
	payments, _ := bu.paymentRepo.GetByBillID(ctx, billID)
	assignments, _ := bu.assignmentRepo.GetByBillID(ctx, billID)

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
	bill.GrandTotal = bill.TotalAmount + (bill.TotalAmount*bill.ServiceCharge/100) + (bill.TotalAmount*bill.Tax/100)

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
		grandTotal := bill.TotalAmount + (bill.TotalAmount*bill.ServiceCharge/100) + (bill.TotalAmount*bill.Tax/100)

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

	bu.assignmentRepo.DeleteByBillID(ctx, billID)
	bu.paymentRepo.DeleteByBillID(ctx, billID)
	bu.itemRepo.DeleteByBillID(ctx, billID)
	bu.personRepo.DeleteByBillID(ctx, billID)

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
	return &domain.UsageResponse{
		Current: 0,
		Limit:   0,
		ResetAt: time.Now().AddDate(0, 1, 0),
	}, nil
}