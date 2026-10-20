package postgres

import (
	"context"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/user/split-mate/internal/domain"
)

type NotificationRepository struct{ Pool *pgxpool.Pool }

func (r *NotificationRepository) List(ctx context.Context, userID string, page int) ([]domain.Notification, error) {
	rows, err := r.Pool.Query(ctx, `SELECT n.id,n.bill_id,u.name,b.title,n.amount,n.read_at,n.created_at,n.email_status FROM notifications n JOIN users u ON u.id=n.actor_user_id JOIN bills b ON b.id=n.bill_id WHERE n.user_id=$1 ORDER BY n.created_at DESC,n.id LIMIT 20 OFFSET $2`, userID, (page-1)*20)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := []domain.Notification{}
	for rows.Next() {
		var n domain.Notification
		if err := rows.Scan(&n.ID, &n.BillID, &n.Actor, &n.Title, &n.Amount, &n.ReadAt, &n.CreatedAt, &n.EmailStatus); err != nil {
			return nil, err
		}
		result = append(result, n)
	}
	return result, rows.Err()
}
func (r *NotificationRepository) Read(ctx context.Context, userID, id string) error {
	res, err := r.Pool.Exec(ctx, `UPDATE notifications SET read_at=COALESCE(read_at,NOW()) WHERE id=$1 AND user_id=$2`, id, userID)
	if err != nil {
		return err
	}
	if res.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}
func (r *NotificationRepository) Debts(ctx context.Context, userID string) ([]domain.Debt, error) {
	rows, err := r.Pool.Query(ctx, `SELECT b.id,b.title,
 CASE WHEN f.user_id=$1 THEN t.id ELSE f.id END,
 CASE WHEN f.user_id=$1 THEN t.user_id ELSE f.user_id END,
 CASE WHEN f.user_id=$1 THEN t.name ELSE f.name END,
 CASE WHEN f.user_id=$1 THEN 'payable' ELSE 'receivable' END,pm.amount
 FROM payments pm JOIN bills b ON b.id=pm.bill_id JOIN persons f ON f.id=pm.from_person_id JOIN persons t ON t.id=pm.to_person_id
 WHERE NOT pm.is_paid AND (f.user_id=$1 OR t.user_id=$1) ORDER BY b.created_at DESC,pm.id`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := []domain.Debt{}
	for rows.Next() {
		var d domain.Debt
		if err := rows.Scan(&d.BillID, &d.Title, &d.PersonID, &d.UserID, &d.Name, &d.Direction, &d.Amount); err != nil {
			return nil, err
		}
		result = append(result, d)
	}
	return result, rows.Err()
}

func (r *NotificationRepository) Settlements(ctx context.Context, userID string) ([]domain.Settlement, error) {
	debts, err := r.Debts(ctx, userID)
	if err != nil {
		return nil, err
	}
	type aggregate struct {
		id   *string
		name string
		net  float64
	}
	byKey := map[string]*aggregate{}
	for _, debt := range debts {
		key := debt.BillID + ":" + debt.PersonID
		if debt.UserID != nil {
			key = *debt.UserID
		}
		item := byKey[key]
		if item == nil {
			item = &aggregate{id: debt.UserID, name: debt.Name}
			byKey[key] = item
		}
		if debt.Direction == "receivable" {
			item.net += debt.Amount
		} else {
			item.net -= debt.Amount
		}
	}
	result := make([]domain.Settlement, 0, len(byKey))
	for _, item := range byKey {
		if item.net == 0 {
			continue
		}
		direction := "receivable"
		amount := item.net
		if amount < 0 {
			direction, amount = "payable", -amount
		}
		result = append(result, domain.Settlement{CounterpartyID: item.id, Counterparty: item.name, Direction: direction, Amount: amount})
	}
	return result, nil
}
