package postgres

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/user/split-mate/internal/domain"
)

type assignmentRepository struct {
	Pool *pgxpool.Pool
}

func NewAssignmentRepository(pool *pgxpool.Pool) domain.AssignmentRepository {
	return &assignmentRepository{Pool: pool}
}

func (r *assignmentRepository) Create(ctx context.Context, assignment *domain.ItemAssignment) error {
	if assignment.ID == "" {
		assignment.ID = uuid.New().String()
	}
	query := `
		INSERT INTO item_assignments (id, item_id, person_id, created_at)
		VALUES ($1, $2, $3, $4)
	`
	_, err := r.Pool.Exec(ctx, query, assignment.ID, assignment.ItemID, assignment.PersonID, assignment.CreatedAt)
	return err
}

func (r *assignmentRepository) GetByBillID(ctx context.Context, billID string) ([]domain.ItemAssignment, error) {
	query := `
		SELECT ia.id, ia.item_id, ia.person_id, ia.created_at
		FROM item_assignments ia
		JOIN items i ON ia.item_id = i.id
		WHERE i.bill_id = $1
	`
	rows, err := r.Pool.Query(ctx, query, billID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var assignments []domain.ItemAssignment
	for rows.Next() {
		var a domain.ItemAssignment
		if err := rows.Scan(&a.ID, &a.ItemID, &a.PersonID, &a.CreatedAt); err != nil {
			return nil, err
		}
		assignments = append(assignments, a)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return assignments, nil
}

func (r *assignmentRepository) DeleteByBillID(ctx context.Context, billID string) error {
	query := `
		DELETE FROM item_assignments 
		WHERE item_id IN (SELECT id FROM items WHERE bill_id = $1)
	`
	_, err := r.Pool.Exec(ctx, query, billID)
	return err
}