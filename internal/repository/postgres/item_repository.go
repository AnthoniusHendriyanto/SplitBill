package postgres

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/user/split-mate/internal/domain"
)

type itemRepository struct {
	Pool *pgxpool.Pool
}

func NewItemRepository(pool *pgxpool.Pool) domain.ItemRepository {
	return &itemRepository{Pool: pool}
}

func (r *itemRepository) Create(ctx context.Context, item *domain.Item) error {
	if item.ID == "" {
		item.ID = uuid.New().String()
	}
	query := `
		INSERT INTO items (id, bill_id, name, price, created_at)
		VALUES ($1, $2, $3, $4, $5)
	`
	_, err := r.Pool.Exec(ctx, query, item.ID, item.BillID, item.Name, item.Price, item.CreatedAt)
	return err
}

func (r *itemRepository) GetByBillID(ctx context.Context, billID string) ([]domain.Item, error) {
	query := `SELECT id, bill_id, name, price, created_at FROM items WHERE bill_id = $1 ORDER BY created_at`
	rows, err := r.Pool.Query(ctx, query, billID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []domain.Item
	for rows.Next() {
		var item domain.Item
		if err := rows.Scan(&item.ID, &item.BillID, &item.Name, &item.Price, &item.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, nil
}

func (r *itemRepository) Update(ctx context.Context, item *domain.Item) error {
	query := `UPDATE items SET name = $1, price = $2 WHERE id = $3`
	_, err := r.Pool.Exec(ctx, query, item.Name, item.Price, item.ID)
	return err
}

func (r *itemRepository) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM items WHERE id = $1`
	_, err := r.Pool.Exec(ctx, query, id)
	return err
}

func (r *itemRepository) DeleteByBillID(ctx context.Context, billID string) error {
	query := `DELETE FROM items WHERE bill_id = $1`
	_, err := r.Pool.Exec(ctx, query, billID)
	return err
}

type personRepository struct {
	Pool *pgxpool.Pool
}

func NewPersonRepository(pool *pgxpool.Pool) domain.PersonRepository {
	return &personRepository{Pool: pool}
}

func (r *personRepository) Create(ctx context.Context, person *domain.Person) error {
	if person.ID == "" {
		person.ID = uuid.New().String()
	}
	query := `
		INSERT INTO persons (id, bill_id, name, is_payer, percentage, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`
	_, err := r.Pool.Exec(ctx, query, person.ID, person.BillID, person.Name, person.IsPayer, person.Percentage, person.CreatedAt)
	return err
}

func (r *personRepository) GetByBillID(ctx context.Context, billID string) ([]domain.Person, error) {
	query := `SELECT id, bill_id, name, is_payer, percentage, created_at FROM persons WHERE bill_id = $1`
	rows, err := r.Pool.Query(ctx, query, billID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var persons []domain.Person
	for rows.Next() {
		var person domain.Person
		if err := rows.Scan(&person.ID, &person.BillID, &person.Name, &person.IsPayer, &person.Percentage, &person.CreatedAt); err != nil {
			return nil, err
		}
		persons = append(persons, person)
	}
	return persons, nil
}

func (r *personRepository) Update(ctx context.Context, person *domain.Person) error {
	query := `UPDATE persons SET name = $1, is_payer = $2, percentage = $3 WHERE id = $4`
	_, err := r.Pool.Exec(ctx, query, person.Name, person.IsPayer, person.Percentage, person.ID)
	return err
}

func (r *personRepository) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM persons WHERE id = $1`
	_, err := r.Pool.Exec(ctx, query, id)
	return err
}

func (r *personRepository) DeleteByBillID(ctx context.Context, billID string) error {
	query := `DELETE FROM persons WHERE bill_id = $1`
	_, err := r.Pool.Exec(ctx, query, billID)
	return err
}