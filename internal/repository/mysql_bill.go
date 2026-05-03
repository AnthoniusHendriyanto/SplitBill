package repository

import (
	"context"
	"database/sql"
	"github.com/user/split-mate/internal/domain"
)

type mysqlBillRepository struct {
	Conn *sql.DB
}

func NewMySQLBillRepository(conn *sql.DB) domain.BillRepository {
	return &mysqlBillRepository{conn}
}

func (m *mysqlBillRepository) Fetch(ctx context.Context) ([]domain.Bill, error) {
	query := `SELECT id, title, service_charge, tax, created_at, updated_at FROM bills`
	rows, err := m.Conn.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var res []domain.Bill
	for rows.Next() {
		b := domain.Bill{}
		err = rows.Scan(&b.ID, &b.Title, &b.ServiceCharge, &b.Tax, &b.CreatedAt, &b.UpdatedAt)
		if err != nil {
			return nil, err
		}
		res = append(res, b)
	}
	return res, nil
}

func (m *mysqlBillRepository) GetByID(ctx context.Context, id string) (domain.Bill, error) {
	query := `SELECT id, title, service_charge, tax, created_at, updated_at FROM bills WHERE id = ?`
	row := m.Conn.QueryRowContext(ctx, query, id)
	b := domain.Bill{}
	err := row.Scan(&b.ID, &b.Title, &b.ServiceCharge, &b.Tax, &b.CreatedAt, &b.UpdatedAt)
	if err != nil {
		return domain.Bill{}, err
	}
	return b, nil
}

func (m *mysqlBillRepository) Store(ctx context.Context, b *domain.Bill) error {
	query := `INSERT INTO bills (id, title, service_charge, tax, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`
	_, err := m.Conn.ExecContext(ctx, query, b.ID, b.Title, b.ServiceCharge, b.Tax, b.CreatedAt, b.UpdatedAt)
	return err
}
