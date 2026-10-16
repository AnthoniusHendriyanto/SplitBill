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

func (r *paymentRepository) MarkPersonPaymentsPaid(ctx context.Context, billID, personID string) (int64, error) {
	tx, err := r.Pool.Begin(ctx)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback(ctx)
	if _, err = tx.Exec(ctx, `SELECT id FROM bills WHERE id=$1 FOR UPDATE`, billID); err != nil {
		return 0, err
	}
	query := `UPDATE payments SET is_paid = true, paid_at = NOW() WHERE bill_id = $1 AND from_person_id = $2`
	res, err := tx.Exec(ctx, query, billID, personID)
	if err != nil {
		return 0, err
	}
	if res.RowsAffected() == 0 {
		return 0, domain.ErrNotFound
	}
	if _, err = tx.Exec(ctx, `UPDATE bills SET status='completed',updated_at=NOW() WHERE id=$1 AND NOT EXISTS(SELECT 1 FROM payments WHERE bill_id=$1 AND NOT is_paid)`, billID); err != nil {
		return 0, err
	}
	return res.RowsAffected(), tx.Commit(ctx)
}

func (r *paymentRepository) AllPaymentsPaid(ctx context.Context, billID string) (bool, error) {
	query := `
		SELECT NOT EXISTS (
			SELECT 1 FROM payments pm
			JOIN persons p ON p.id = pm.from_person_id
			WHERE pm.bill_id = $1 AND NOT p.is_payer AND NOT pm.is_paid
		)
	`
	var paid bool
	err := r.Pool.QueryRow(ctx, query, billID).Scan(&paid)
	return paid, err
}

func (r *paymentRepository) GetUserPaymentSummaryByBillIDs(ctx context.Context, billIDs []string, userID string) (map[string]domain.UserPaymentSummary, error) {
	result := make(map[string]domain.UserPaymentSummary)
	if len(billIDs) == 0 {
		return result, nil
	}

	query := `
		SELECT p.bill_id,
			COALESCE(MAX(p.share_amount),SUM(CASE
				WHEN pm.from_person_id = p.id THEN pm.amount
				WHEN pm.to_person_id = p.id AND p.is_payer THEN -pm.amount
				ELSE 0
			END), 0) AS user_share,
			COALESCE(SUM(CASE WHEN pm.to_person_id = p.id AND NOT pm.is_paid THEN pm.amount ELSE 0 END), 0) AS receivable,
			COALESCE(SUM(CASE WHEN pm.from_person_id = p.id AND NOT pm.is_paid THEN pm.amount ELSE 0 END), 0) AS payable
		FROM persons p
		LEFT JOIN payments pm ON pm.bill_id = p.bill_id
		WHERE p.bill_id = ANY($1) AND p.user_id = $2
		GROUP BY p.bill_id
	`
	args := []interface{}{billIDs, userID}

	rows, err := r.Pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var billID string
		var summary domain.UserPaymentSummary
		if err := rows.Scan(&billID, &summary.UserShare, &summary.Receivable, &summary.Payable); err != nil {
			return nil, err
		}
		result[billID] = summary
	}
	return result, rows.Err()
}

func (r *paymentRepository) DeleteByBillID(ctx context.Context, billID string) error {
	query := `DELETE FROM payments WHERE bill_id = $1`
	_, err := r.Pool.Exec(ctx, query, billID)
	return err
}
