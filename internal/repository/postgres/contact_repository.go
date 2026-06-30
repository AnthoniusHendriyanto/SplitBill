package postgres

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/user/split-mate/internal/domain"
)

type contactRepository struct {
	Pool *pgxpool.Pool
}

func NewContactRepository(pool *pgxpool.Pool) domain.ContactRepository {
	return &contactRepository{Pool: pool}
}

func (r *contactRepository) GetByUserID(ctx context.Context, userID string) ([]domain.Contact, error) {
	rows, err := r.Pool.Query(ctx, `SELECT id, user_id, name, created_at FROM contacts WHERE user_id = $1 ORDER BY name`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var contacts []domain.Contact
	for rows.Next() {
		var c domain.Contact
		if err := rows.Scan(&c.ID, &c.UserID, &c.Name, &c.CreatedAt); err != nil {
			return nil, err
		}
		contacts = append(contacts, c)
	}
	return contacts, rows.Err()
}

func (r *contactRepository) Create(ctx context.Context, contact *domain.Contact) error {
	return r.Pool.QueryRow(ctx,
		`INSERT INTO contacts (id, user_id, name) VALUES ($1, $2, $3) RETURNING id, created_at`,
		contact.ID, contact.UserID, contact.Name,
	).Scan(&contact.ID, &contact.CreatedAt)
}

func (r *contactRepository) Delete(ctx context.Context, id, userID string) error {
	_, err := r.Pool.Exec(ctx, `DELETE FROM contacts WHERE id = $1 AND user_id = $2`, id, userID)
	return err
}
