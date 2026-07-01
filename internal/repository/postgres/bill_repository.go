package postgres

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/user/split-mate/internal/domain"
)

type billRepository struct {
	Pool *pgxpool.Pool
}

func NewBillRepository(pool *pgxpool.Pool) domain.BillRepository {
	return &billRepository{Pool: pool}
}

func (r *billRepository) Create(ctx context.Context, bill *domain.Bill) error {
	if bill.ID == "" {
		bill.ID = uuid.New().String()
	}
	query := `
		INSERT INTO bills (id, user_id, title, merchant, total_amount, service_charge, service_mode, tax, tax_mode, discount, grand_total, status, split_type, bill_date, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
	`
	_, err := r.Pool.Exec(ctx, query,
		bill.ID, bill.UserID, bill.Title, bill.Merchant, bill.TotalAmount, bill.ServiceCharge, bill.ServiceMode,
		bill.Tax, bill.TaxMode, bill.Discount, bill.GrandTotal, bill.Status,
		bill.SplitType, bill.BillDate, bill.CreatedAt, bill.UpdatedAt)
	return err
}

func (r *billRepository) GetByID(ctx context.Context, id string) (domain.Bill, error) {
	query := `
		SELECT id, user_id, title, merchant, total_amount, service_charge, service_mode, tax, tax_mode, discount, grand_total, status, split_type, bill_date, created_at, updated_at
		FROM bills WHERE id = $1
	`
	var bill domain.Bill
	err := r.Pool.QueryRow(ctx, query, id).Scan(
		&bill.ID, &bill.UserID, &bill.Title, &bill.Merchant, &bill.TotalAmount, &bill.ServiceCharge, &bill.ServiceMode,
		&bill.Tax, &bill.TaxMode, &bill.Discount, &bill.GrandTotal, &bill.Status,
		&bill.SplitType, &bill.BillDate, &bill.CreatedAt, &bill.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.Bill{}, domain.ErrNotFound
	}
	return bill, err
}

func (r *billRepository) GetByUserID(ctx context.Context, userID string, page, limit int, fromDate, toDate string) ([]domain.Bill, int, error) {
	offset := (page - 1) * limit

	baseQuery := `FROM bills WHERE user_id = $1 OR id IN (SELECT bill_id FROM persons WHERE user_id = $1 OR (user_id IS NULL AND is_payer AND bill_id IN (SELECT id FROM bills WHERE user_id = $1)))`
	args := []interface{}{userID}

	if fromDate != "" {
		baseQuery += fmt.Sprintf(" AND created_at >= $%d", len(args)+1)
		args = append(args, fromDate)
	}
	if toDate != "" {
		baseQuery += fmt.Sprintf(" AND created_at <= $%d", len(args)+1)
		args = append(args, toDate)
	}

	countQuery := "SELECT COUNT(*) " + baseQuery
	var total int
	if err := r.Pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	selectQuery := fmt.Sprintf(`
		SELECT id, user_id, title, merchant, total_amount, service_charge, service_mode, tax, tax_mode, discount, grand_total, status, split_type, bill_date, created_at, updated_at
		%s ORDER BY created_at DESC LIMIT $%d OFFSET $%d
	`, baseQuery, len(args)+1, len(args)+2)
	args = append(args, limit, offset)

	rows, err := r.Pool.Query(ctx, selectQuery, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var bills []domain.Bill
	for rows.Next() {
		var bill domain.Bill
		if err := rows.Scan(
			&bill.ID, &bill.UserID, &bill.Title, &bill.Merchant, &bill.TotalAmount, &bill.ServiceCharge, &bill.ServiceMode,
			&bill.Tax, &bill.TaxMode, &bill.Discount, &bill.GrandTotal, &bill.Status,
			&bill.SplitType, &bill.BillDate, &bill.CreatedAt, &bill.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		bills = append(bills, bill)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}

	return bills, total, nil
}

func (r *billRepository) GetByUserIDAndID(ctx context.Context, userID, billID string) (domain.Bill, error) {
	query := `
		SELECT id, user_id, title, merchant, total_amount, service_charge, service_mode, tax, tax_mode, discount, grand_total, status, split_type, bill_date, created_at, updated_at
		FROM bills WHERE id = $1 AND (user_id = $2 OR id IN (SELECT bill_id FROM persons WHERE user_id = $2 OR (user_id IS NULL AND name = (SELECT name FROM users WHERE id = $2))))
	`
	var bill domain.Bill
	err := r.Pool.QueryRow(ctx, query, billID, userID).Scan(
		&bill.ID, &bill.UserID, &bill.Title, &bill.Merchant, &bill.TotalAmount, &bill.ServiceCharge, &bill.ServiceMode,
		&bill.Tax, &bill.TaxMode, &bill.Discount, &bill.GrandTotal, &bill.Status,
		&bill.SplitType, &bill.BillDate, &bill.CreatedAt, &bill.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.Bill{}, domain.ErrNotFound
	}
	return bill, err
}

func (r *billRepository) Update(ctx context.Context, bill *domain.Bill) error {
	query := `
		UPDATE bills SET title = $1, merchant = $2, total_amount = $3, service_charge = $4, service_mode = $5,
		       tax = $6, tax_mode = $7, discount = $8, grand_total = $9, status = $10,
		       split_type = $11, bill_date = $12, updated_at = $13 WHERE id = $14
	`
	_, err := r.Pool.Exec(ctx, query, bill.Title, bill.Merchant, bill.TotalAmount, bill.ServiceCharge, bill.ServiceMode,
		bill.Tax, bill.TaxMode, bill.Discount, bill.GrandTotal, bill.Status,
		bill.SplitType, bill.BillDate, bill.UpdatedAt, bill.ID)
	return err
}

func (r *billRepository) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM bills WHERE id = $1`
	_, err := r.Pool.Exec(ctx, query, id)
	return err
}

func (r *billRepository) CreateFull(ctx context.Context, bill *domain.Bill, items []domain.Item, persons []domain.Person, assignments []domain.ItemAssignment) error {
	tx, err := r.Pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	bill.ID = uuid.New().String()
	billQuery := `
		INSERT INTO bills (id, user_id, title, merchant, total_amount, service_charge, service_mode, tax, tax_mode, discount, grand_total, status, split_type, bill_date, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
	`
	if _, err := tx.Exec(ctx, billQuery,
		bill.ID, bill.UserID, bill.Title, bill.Merchant, bill.TotalAmount, bill.ServiceCharge, bill.ServiceMode,
		bill.Tax, bill.TaxMode, bill.Discount, bill.GrandTotal, bill.Status,
		bill.SplitType, bill.BillDate, bill.CreatedAt, bill.UpdatedAt); err != nil {
		return fmt.Errorf("insert bill: %w", err)
	}

	itemIDMap := make(map[string]string, len(items))
	for i := range items {
		oldID := items[i].ID
		items[i].ID = uuid.New().String()
		items[i].BillID = bill.ID
		itemIDMap[oldID] = items[i].ID
		qty := items[i].Quantity
		if qty < 1 {
			qty = 1
		}
		if _, err := tx.Exec(ctx, `
			INSERT INTO items (id, bill_id, name, price, quantity, created_at)
			VALUES ($1, $2, $3, $4, $5, $6)
		`, items[i].ID, items[i].BillID, items[i].Name, items[i].Price, qty, items[i].CreatedAt); err != nil {
			return fmt.Errorf("insert item: %w", err)
		}
	}

	personIDMap := make(map[string]string, len(persons))
	for i := range persons {
		oldID := persons[i].ID
		persons[i].ID = uuid.New().String()
		persons[i].BillID = bill.ID
		personIDMap[oldID] = persons[i].ID
		if _, err := tx.Exec(ctx, `
			INSERT INTO persons (id, bill_id, name, email, is_payer, percentage, payment_info, created_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		`, persons[i].ID, persons[i].BillID, persons[i].Name, persons[i].Email, persons[i].IsPayer, persons[i].Percentage, persons[i].PaymentInfo, persons[i].CreatedAt); err != nil {
			return fmt.Errorf("insert person: %w", err)
		}
	}

	for i := range assignments {
		assignments[i].ID = uuid.New().String()
		if newItemID, ok := itemIDMap[assignments[i].ItemID]; ok {
			assignments[i].ItemID = newItemID
		}
		if newPersonID, ok := personIDMap[assignments[i].PersonID]; ok {
			assignments[i].PersonID = newPersonID
		}
		if _, err := tx.Exec(ctx, `
			INSERT INTO item_assignments (id, item_id, person_id, created_at)
			VALUES ($1, $2, $3, $4)
		`, assignments[i].ID, assignments[i].ItemID, assignments[i].PersonID, assignments[i].CreatedAt); err != nil {
			return fmt.Errorf("insert assignment: %w", err)
		}
	}

	return tx.Commit(ctx)
}

func (r *billRepository) CreatePayments(ctx context.Context, billID string, payments []domain.Payment) error {
	tx, err := r.Pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	for _, payment := range payments {
		if payment.ID == "" {
			payment.ID = uuid.New().String()
		}
		payment.BillID = billID
		if _, err := tx.Exec(ctx, `
			INSERT INTO payments (id, bill_id, from_person_id, to_person_id, amount, is_paid, paid_at, created_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		`, payment.ID, payment.BillID, payment.FromPersonID, payment.ToPersonID,
			payment.Amount, payment.IsPaid, payment.PaidAt, payment.CreatedAt); err != nil {
			return fmt.Errorf("insert payment: %w", err)
		}
	}

	return tx.Commit(ctx)
}