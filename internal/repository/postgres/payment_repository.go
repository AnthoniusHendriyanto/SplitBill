package postgres

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/user/split-mate/internal/domain"
)

type paymentRepository struct {
	Pool *pgxpool.Pool
}

func NewPaymentRepository(pool *pgxpool.Pool) domain.PaymentRepository {
	return &paymentRepository{Pool: pool}
}

func (r *paymentRepository) Create(ctx context.Context, payment *domain.Payment) error {
	if payment.ID == "" {
		payment.ID = uuid.New().String()
	}
	query := `
		INSERT INTO payments (id, bill_id, from_person_id, to_person_id, amount, is_paid, paid_at, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`
	_, err := r.Pool.Exec(ctx, query,
		payment.ID, payment.BillID, payment.FromPersonID, payment.ToPersonID,
		payment.Amount, payment.IsPaid, payment.PaidAt, payment.CreatedAt)
	return err
}

func (r *paymentRepository) GetByBillID(ctx context.Context, billID string) ([]domain.Payment, error) {
	query := `
		SELECT id, bill_id, from_person_id, to_person_id, amount, is_paid, paid_at, created_at
		FROM payments WHERE bill_id = $1
	`
	rows, err := r.Pool.Query(ctx, query, billID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var payments []domain.Payment
	for rows.Next() {
		var p domain.Payment
		if err := rows.Scan(&p.ID, &p.BillID, &p.FromPersonID, &p.ToPersonID,
			&p.Amount, &p.IsPaid, &p.PaidAt, &p.CreatedAt); err != nil {
			return nil, err
		}
		payments = append(payments, p)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return payments, nil
}

func (r *paymentRepository) Update(ctx context.Context, payment *domain.Payment) error {
	query := `UPDATE payments SET is_paid = $1, paid_at = $2 WHERE id = $3`
	_, err := r.Pool.Exec(ctx, query, payment.IsPaid, payment.PaidAt, payment.ID)
	return err
}

func (r *paymentRepository) DeleteByBillID(ctx context.Context, billID string) error {
	query := `DELETE FROM payments WHERE bill_id = $1`
	_, err := r.Pool.Exec(ctx, query, billID)
	return err
}