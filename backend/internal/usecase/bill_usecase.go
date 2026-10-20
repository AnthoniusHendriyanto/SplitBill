package usecase

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"strings"
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
	shareRepo      domain.ShareRepository
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
	contactRepo domain.ContactRepository,
	ocrService domain.OCRService,
	timeout time.Duration,
) BillUsecase {
	return newBillUsecase(billRepo, itemRepo, personRepo, assignmentRepo, paymentRepo, usageRepo, userRepo, contactRepo, ocrService, timeout, nil)
}

func NewBillUsecaseWithShare(
	billRepo domain.BillRepository,
	itemRepo domain.ItemRepository,
	personRepo domain.PersonRepository,
	assignmentRepo domain.AssignmentRepository,
	paymentRepo domain.PaymentRepository,
	usageRepo domain.UsageRepository,
	userRepo domain.UserRepository,
	contactRepo domain.ContactRepository,
	ocrService domain.OCRService,
	shareRepo domain.ShareRepository,
	timeout time.Duration,
) BillUsecase {
	return newBillUsecase(billRepo, itemRepo, personRepo, assignmentRepo, paymentRepo, usageRepo, userRepo, contactRepo, ocrService, timeout, shareRepo)
}

func newBillUsecase(
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
	shareRepo domain.ShareRepository,
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
		shareRepo:      shareRepo,
		contextTimeout: timeout,
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

	if req.SplitType == string(domain.SplitTypeCustom) || req.SplitType == string(domain.SplitTypePercentage) {
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
		Category:      normalizedCategory(req.Category),
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
	if req.ReceiptImage != "" {
		image, mime, err := decodeReceiptImage(req.ReceiptImage, req.ReceiptMime)
		if err != nil {
			return nil, err
		}
		bill.ReceiptImage = image
		bill.ReceiptMime = mime
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

func (bu *billUsecase) Update(ctx context.Context, userID, billID string, req *domain.UpdateBillRequest) (*domain.Bill, error) {
	ctx, cancel := context.WithTimeout(ctx, bu.contextTimeout)
	defer cancel()
	existing, err := bu.billRepo.GetByUserIDAndID(ctx, userID, billID)
	if err != nil {
		return nil, err
	}
	if existing.UserID != userID || existing.Status == "draft" {
		return nil, domain.ErrNotFound
	}
	if req.RequestKey == "" {
		return nil, fmt.Errorf("%w: request_key is required", domain.ErrInvalidInput)
	}
	hashBytes, _ := json.Marshal(req)
	hash := fmt.Sprintf("%x", sha256.Sum256(hashBytes))
	if existing.UpdateRequestKey == req.RequestKey {
		if existing.UpdateRequestHash != hash {
			return nil, fmt.Errorf("%w: update request key already used for another payload", domain.ErrInvalidInput)
		}
		if existing.UpdatedResponse != nil {
			var saved domain.Bill
			if err := json.Unmarshal(existing.UpdatedResponse, &saved); err == nil {
				return &saved, nil
			}
		}
	}
	if req.Status == "" {
		req.Status = existing.Status
	}
	if req.Status != "pending" && req.Status != "completed" {
		return nil, fmt.Errorf("%w: finalized bills must remain pending or completed", domain.ErrInvalidInput)
	}
	if _, err := time.Parse("2006-01-02", req.BillDate); err != nil {
		return nil, fmt.Errorf("%w: invalid bill date", domain.ErrInvalidInput)
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
	if (req.SplitType == string(domain.SplitTypeCustom) || req.SplitType == string(domain.SplitTypePercentage)) && !isPremium {
		return nil, domain.ErrPremiumRequired
	}
	if req.SplitType == string(domain.SplitTypePercentage) {
		total := 0.0
		for _, person := range req.Persons {
			total += person.Percentage
		}
		if total < 99.9 || total > 100.1 {
			return nil, fmt.Errorf("%w: percentages must sum to 100 (got %.1f%%)", domain.ErrInvalidInput, total)
		}
	}
	now := time.Now()
	serviceMode, taxMode := req.ServiceMode, req.TaxMode
	if serviceMode == "" {
		serviceMode = existing.ServiceMode
	}
	if taxMode == "" {
		taxMode = existing.TaxMode
	}
	bill := &domain.Bill{ID: billID, UserID: userID, Title: req.Title, Merchant: req.Merchant, Category: normalizedCategory(req.Category), ServiceCharge: req.ServiceCharge, ServiceMode: serviceMode, Tax: req.Tax, TaxMode: taxMode, Discount: req.Discount, Status: req.Status, SplitType: req.SplitType, BillDate: req.BillDate, CreatedAt: existing.CreatedAt, UpdatedAt: now, RequestKey: existing.RequestKey, RequestHash: existing.RequestHash, GroupID: existing.GroupID}
	if req.ReceiptImage != "" {
		image, mime, err := decodeReceiptImage(req.ReceiptImage, req.ReceiptMime)
		if err != nil {
			return nil, err
		}
		bill.ReceiptImage, bill.ReceiptMime = image, mime
	} else {
		bill.ReceiptMime = existing.ReceiptMime
	}
	items := make([]domain.Item, len(req.Items))
	for i, item := range req.Items {
		qty := item.Quantity
		if qty < 1 {
			qty = 1
		}
		items[i] = domain.Item{ID: item.ID, BillID: billID, Name: item.Name, Price: item.Price, Quantity: qty, CreatedAt: now}
		bill.TotalAmount += item.Price * float64(qty)
	}
	persons := make([]domain.Person, len(req.Persons))
	linked := map[string]bool{}
	for i, person := range req.Persons {
		persons[i] = domain.Person{ID: person.ID, BillID: billID, Name: person.Name, Email: person.Email, IsPayer: person.IsPayer, Percentage: person.Percentage, CustomAmount: person.CustomAmount, PaymentInfo: person.PaymentInfo, CreatedAt: now}
		if persons[i].PaymentInfo == nil {
			persons[i].PaymentInfo = map[string]interface{}{}
		}
		if person.UserID == "" {
			continue
		}
		allowed := person.UserID == userID
		for _, contact := range contacts {
			if contact.ConnectedUserID == person.UserID {
				allowed = true
			}
		}
		if !allowed || linked[person.UserID] {
			return nil, fmt.Errorf("%w: invalid or duplicate linked friend", domain.ErrInvalidInput)
		}
		account, err := bu.userRepo.GetByID(ctx, person.UserID)
		if err != nil {
			return nil, err
		}
		persons[i].UserID, persons[i].Name, persons[i].Email = &account.ID, account.Name, account.Email
		linked[person.UserID] = true
	}
	assignments := make([]domain.ItemAssignment, 0, len(req.Assignments))
	for _, assignment := range req.Assignments {
		assignments = append(assignments, domain.ItemAssignment{ItemID: assignment.ItemID, PersonID: assignment.PersonID, CreatedAt: now})
	}
	bill.GrandTotal = bill.CalculateGrandTotal()
	shares, err := domain.CalculateShares(*bill, items, persons, assignments)
	if err != nil {
		return nil, err
	}
	payer := findPayer(persons)
	for i := range persons {
		persons[i].ShareAmount = &shares[i]
		if persons[i].ID != payer.ID && shares[i] > 0 {
			bill.Payments = append(bill.Payments, domain.Payment{FromPersonID: persons[i].ID, ToPersonID: payer.ID, FromPerson: persons[i].Name, ToPerson: payer.Name, Amount: shares[i], CreatedAt: now})
		}
	}
	if len(bill.Payments) == 0 {
		bill.Status = "completed"
	} else if req.Status == "completed" {
		bill.Status = "pending"
	}
	bill.UpdateRequestKey, bill.UpdateRequestHash = req.RequestKey, hash
	if err := bu.billRepo.UpdateFull(ctx, bill, items, persons, assignments); err != nil {
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
	peopleByBill := map[string][]domain.Person{}
	if len(billIDs) > 0 {
		paymentSummaries, err = bu.paymentRepo.GetUserPaymentSummaryByBillIDs(ctx, billIDs, userID)
		if err != nil {
			return nil, err
		}
		peopleByBill, err = bu.personRepo.GetByBillIDs(ctx, billIDs)
		if err != nil {
			return nil, err
		}
	}

	for i, bill := range bills {
		persons := peopleByBill[bill.ID]

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
			Category:    bill.Category,
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

func decodeReceiptImage(value, requestedMime string) ([]byte, string, error) {
	parts := strings.SplitN(value, ",", 2)
	encoded := value
	mime := requestedMime
	if len(parts) == 2 {
		encoded = parts[1]
		if strings.HasPrefix(parts[0], "data:") {
			meta := strings.TrimPrefix(parts[0], "data:")
			if semi := strings.IndexByte(meta, ';'); semi >= 0 {
				if mime == "" {
					mime = meta[:semi]
				}
			} else if mime == "" {
				mime = meta
			}
		}
	}
	allowedMime := map[string]bool{"image/jpeg": true, "image/png": true, "image/webp": true, "image/gif": true}
	if !allowedMime[strings.ToLower(mime)] {
		return nil, "", fmt.Errorf("%w: receipt must be an image", domain.ErrInvalidInput)
	}
	image, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil || len(image) == 0 || len(image) > 10<<20 {
		return nil, "", fmt.Errorf("%w: invalid or oversized receipt image", domain.ErrInvalidInput)
	}
	return image, mime, nil
}

func (bu *billUsecase) GetReceipt(ctx context.Context, userID, billID string) ([]byte, string, error) {
	ctx, cancel := context.WithTimeout(ctx, bu.contextTimeout)
	defer cancel()
	return bu.billRepo.GetReceipt(ctx, userID, billID)
}

func (bu *billUsecase) CreateShare(ctx context.Context, userID, billID string, days int) (*domain.ShareLink, error) {
	if bu.shareRepo == nil {
		return nil, domain.ErrInvalidInput
	}
	if days < 1 || days > 30 {
		days = 7
	}
	ctx, cancel := context.WithTimeout(ctx, bu.contextTimeout)
	defer cancel()
	bill, err := bu.billRepo.GetByUserIDAndID(ctx, userID, billID)
	if err != nil || bill.UserID != userID {
		return nil, domain.ErrNotFound
	}
	if bill.Status == "draft" {
		return nil, fmt.Errorf("%w: drafts cannot be shared", domain.ErrInvalidInput)
	}
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return nil, err
	}
	token := base64.RawURLEncoding.EncodeToString(bytes)
	hash := fmt.Sprintf("%x", sha256.Sum256([]byte(token)))
	expires := time.Now().Add(time.Duration(days) * 24 * time.Hour)
	if err := bu.shareRepo.Create(ctx, billID, userID, hash, expires); err != nil {
		return nil, err
	}
	return &domain.ShareLink{Token: token, BillID: billID, ExpiresAt: expires}, nil
}

func (bu *billUsecase) RevokeShare(ctx context.Context, userID, billID string) error {
	if bu.shareRepo == nil {
		return domain.ErrInvalidInput
	}
	ctx, cancel := context.WithTimeout(ctx, bu.contextTimeout)
	defer cancel()
	return bu.shareRepo.RevokeByBillID(ctx, billID, userID)
}

func (bu *billUsecase) GetShared(ctx context.Context, token string) (*domain.PublicBill, error) {
	if bu.shareRepo == nil || token == "" {
		return nil, domain.ErrNotFound
	}
	ctx, cancel := context.WithTimeout(ctx, bu.contextTimeout)
	defer cancel()
	hash := fmt.Sprintf("%x", sha256.Sum256([]byte(token)))
	billID, err := bu.shareRepo.GetByTokenHash(ctx, hash)
	if err != nil {
		return nil, err
	}
	bill, err := bu.billRepo.GetByID(ctx, billID)
	if err != nil || bill.Status == "draft" {
		return nil, domain.ErrNotFound
	}
	items, err := bu.itemRepo.GetByBillID(ctx, billID)
	if err != nil {
		return nil, err
	}
	persons, err := bu.personRepo.GetByBillID(ctx, billID)
	if err != nil {
		return nil, err
	}
	publicPersons := make([]domain.PublicPerson, 0, len(persons))
	publicItems := make([]domain.PublicItem, 0, len(items))
	for _, item := range items {
		publicItems = append(publicItems, domain.PublicItem{Name: item.Name, Price: item.Price, Quantity: item.Quantity})
	}
	payer := ""
	for _, person := range persons {
		share := 0.0
		if person.ShareAmount != nil {
			share = *person.ShareAmount
		}
		publicPersons = append(publicPersons, domain.PublicPerson{Name: person.Name, ShareAmount: share, IsPayer: person.IsPayer})
		if person.IsPayer {
			payer = person.Name
		}
	}
	return &domain.PublicBill{ID: bill.ID, Title: bill.Title, Merchant: bill.Merchant, BillDate: bill.BillDate, GrandTotal: bill.GrandTotal, Status: bill.Status, Items: publicItems, Persons: publicPersons, PayerName: payer}, nil
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

func normalizedCategory(category string) string {
	category = strings.TrimSpace(category)
	if category == "" {
		return "Other"
	}
	if len(category) > 80 {
		return category[:80]
	}
	return category
}
