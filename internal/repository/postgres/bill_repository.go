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
		INSERT INTO bills (id, user_id, title, total_amount, service_charge, tax, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`
	_, err := r.Pool.Exec(ctx, query,
		bill.ID, bill.UserID, bill.Title, bill.TotalAmount, bill.ServiceCharge, bill.Tax,
		bill.CreatedAt, bill.UpdatedAt)
	return err
}

func (r *billRepository) GetByID(ctx context.Context, id string) (domain.Bill, error) {
	query := `
		SELECT id, user_id, title, total_amount, service_charge, tax, created_at, updated_at
		FROM bills WHERE id = $1
	`
	var bill domain.Bill
	err := r.Pool.QueryRow(ctx, query, id).Scan(
		&bill.ID, &bill.UserID, &bill.Title, &bill.TotalAmount, &bill.ServiceCharge,
		&bill.Tax, &bill.CreatedAt, &bill.UpdatedAt,
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
		SELECT id, user_id, title, total_amount, service_charge, tax, created_at, updated_at
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
			&bill.Tax, &bill.CreatedAt, &bill.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		bills = append(bills, bill)
	}

	return bills, total, nil
}

func (r *billRepository) GetByUserIDAndID(ctx context.Context, userID, billID string) (domain.Bill, error) {
	query := `
		SELECT id, user_id, title, total_amount, service_charge, tax, created_at, updated_at
		FROM bills WHERE id = $1 AND user_id = $2
	`
	var bill domain.Bill
	err := r.Pool.QueryRow(ctx, query, billID, userID).Scan(
		&bill.ID, &bill.UserID, &bill.Title, &bill.TotalAmount, &bill.ServiceCharge,
		&bill.Tax, &bill.CreatedAt, &bill.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.Bill{}, domain.ErrNotFound
	}
	return bill, err
}

func (r *billRepository) Update(ctx context.Context, bill *domain.Bill) error {
	query := `
		UPDATE bills SET title = $1, total_amount = $2, service_charge = $3, 
		       tax = $4, updated_at = $5 WHERE id = $6
	`
	_, err := r.Pool.Exec(ctx, query, bill.Title, bill.TotalAmount, bill.ServiceCharge,
		bill.Tax, bill.UpdatedAt, bill.ID)
	return err
}

func (r *billRepository) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM bills WHERE id = $1`
	_, err := r.Pool.Exec(ctx, query, id)
	return err
}