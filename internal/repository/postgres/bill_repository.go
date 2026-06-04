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
		INSERT INTO bills (id, user_id, title, total_amount, service_charge, tax, split_type, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`
	_, err := r.Pool.Exec(ctx, query,
		bill.ID, bill.UserID, bill.Title, bill.TotalAmount, bill.ServiceCharge, bill.Tax,
		bill.SplitType, bill.CreatedAt, bill.UpdatedAt)
	return err
}

func (r *billRepository) GetByID(ctx context.Context, id string) (domain.Bill, error) {
	query := `
		SELECT id, user_id, title, total_amount, service_charge, tax, split_type, created_at, updated_at
		FROM bills WHERE id = $1
	`
	var bill domain.Bill
	err := r.Pool.QueryRow(ctx, query, id).Scan(
		&bill.ID, &bill.UserID, &bill.Title, &bill.TotalAmount, &bill.ServiceCharge,
		&bill.Tax, &bill.SplitType, &bill.CreatedAt, &bill.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.Bill{}, domain.ErrNotFound
	}
	return bill, err
}

func (r *billRepository) GetByUserID(ctx context.Context, userID string, page, limit int, fromDate, toDate string) ([]domain.Bill, int, error) {
	offset := (page - 1) * limit

	baseQuery := `FROM bills WHERE user_id = $1`
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
		SELECT id, user_id, title, total_amount, service_charge, tax, split_type, created_at, updated_at
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
			&bill.ID, &bill.UserID, &bill.Title, &bill.TotalAmount, &bill.ServiceCharge,
			&bill.Tax, &bill.SplitType, &bill.CreatedAt, &bill.UpdatedAt,
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
		SELECT id, user_id, title, total_amount, service_charge, tax, split_type, created_at, updated_at
		FROM bills WHERE id = $1 AND user_id = $2
	`
	var bill domain.Bill
	err := r.Pool.QueryRow(ctx, query, billID, userID).Scan(
		&bill.ID, &bill.UserID, &bill.Title, &bill.TotalAmount, &bill.ServiceCharge,
		&bill.Tax, &bill.SplitType, &bill.CreatedAt, &bill.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.Bill{}, domain.ErrNotFound
	}
	return bill, err
}

func (r *billRepository) Update(ctx context.Context, bill *domain.Bill) error {
	query := `
		UPDATE bills SET title = $1, total_amount = $2, service_charge = $3, 
		       tax = $4, split_type = $5, updated_at = $6 WHERE id = $7
	`
	_, err := r.Pool.Exec(ctx, query, bill.Title, bill.TotalAmount, bill.ServiceCharge,
		bill.Tax, bill.SplitType, bill.UpdatedAt, bill.ID)
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

	if bill.ID == "" {
		bill.ID = uuid.New().String()
	}
	billQuery := `
		INSERT INTO bills (id, user_id, title, total_amount, service_charge, tax, split_type, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`
	if _, err := tx.Exec(ctx, billQuery,
		bill.ID, bill.UserID, bill.Title, bill.TotalAmount, bill.ServiceCharge, bill.Tax,
		bill.SplitType, bill.CreatedAt, bill.UpdatedAt); err != nil {
		return fmt.Errorf("insert bill: %w", err)
	}

	for _, item := range items {
		if item.ID == "" {
			item.ID = uuid.New().String()
		}
		item.BillID = bill.ID
		if _, err := tx.Exec(ctx, `
			INSERT INTO items (id, bill_id, name, price, created_at)
			VALUES ($1, $2, $3, $4, $5)
		`, item.ID, item.BillID, item.Name, item.Price, item.CreatedAt); err != nil {
			return fmt.Errorf("insert item: %w", err)
		}
	}

	for _, person := range persons {
		if person.ID == "" {
			person.ID = uuid.New().String()
		}
		person.BillID = bill.ID
		if _, err := tx.Exec(ctx, `
			INSERT INTO persons (id, bill_id, name, is_payer, percentage, created_at)
			VALUES ($1, $2, $3, $4, $5, $6)
		`, person.ID, person.BillID, person.Name, person.IsPayer, person.Percentage, person.CreatedAt); err != nil {
			return fmt.Errorf("insert person: %w", err)
		}
	}

	for _, a := range assignments {
		if a.ID == "" {
			a.ID = uuid.New().String()
		}
		if _, err := tx.Exec(ctx, `
			INSERT INTO item_assignments (id, item_id, person_id, created_at)
			VALUES ($1, $2, $3, $4)
		`, a.ID, a.ItemID, a.PersonID, a.CreatedAt); err != nil {
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