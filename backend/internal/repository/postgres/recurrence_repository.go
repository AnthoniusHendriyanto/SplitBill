package postgres

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/user/split-mate/internal/domain"
)

type recurrenceRepository struct{ Pool *pgxpool.Pool }

func NewRecurrenceRepository(pool *pgxpool.Pool) domain.RecurrenceRepository {
	return &recurrenceRepository{Pool: pool}
}

func (r *recurrenceRepository) Create(ctx context.Context, recurrence *domain.Recurrence) error {
	if recurrence.ID == "" {
		recurrence.ID = uuid.NewString()
	}
	template, err := json.Marshal(recurrence.Template)
	if err != nil {
		return err
	}
	_, err = r.Pool.Exec(ctx, `INSERT INTO recurrences(id,owner_id,cadence,interval_count,next_run,status,template,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`, recurrence.ID, recurrence.OwnerID, recurrence.Cadence, recurrence.Interval, recurrence.NextRun, recurrence.Status, template, recurrence.CreatedAt, recurrence.UpdatedAt)
	return err
}

func (r *recurrenceRepository) scan(row pgx.Row) (*domain.Recurrence, error) {
	var recurrence domain.Recurrence
	var template []byte
	err := row.Scan(&recurrence.ID, &recurrence.OwnerID, &recurrence.Cadence, &recurrence.Interval, &recurrence.NextRun, &recurrence.Status, &template, &recurrence.LastGeneratedOn, &recurrence.CreatedAt, &recurrence.UpdatedAt)
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal(template, &recurrence.Template); err != nil {
		return nil, err
	}
	return &recurrence, nil
}

const recurrenceColumns = `id,owner_id,cadence,interval_count,next_run::text,status,template,COALESCE(last_generated_on::text,''),created_at,updated_at`

func (r *recurrenceRepository) ListByOwner(ctx context.Context, ownerID string) ([]domain.Recurrence, error) {
	rows, err := r.Pool.Query(ctx, `SELECT `+recurrenceColumns+` FROM recurrences WHERE owner_id=$1 ORDER BY next_run,id`, ownerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := make([]domain.Recurrence, 0)
	for rows.Next() {
		item, err := r.scan(rows)
		if err != nil {
			return nil, err
		}
		result = append(result, *item)
	}
	return result, rows.Err()
}

func (r *recurrenceRepository) GetByOwner(ctx context.Context, ownerID, id string) (*domain.Recurrence, error) {
	item, err := r.scan(r.Pool.QueryRow(ctx, `SELECT `+recurrenceColumns+` FROM recurrences WHERE owner_id=$1 AND id=$2`, ownerID, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	return item, err
}

func (r *recurrenceRepository) SetStatus(ctx context.Context, ownerID, id, status string) error {
	result, err := r.Pool.Exec(ctx, `UPDATE recurrences SET status=$1,updated_at=NOW() WHERE owner_id=$2 AND id=$3`, status, ownerID, id)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *recurrenceRepository) ListDue(ctx context.Context, now string) ([]domain.Recurrence, error) {
	rows, err := r.Pool.Query(ctx, `SELECT `+recurrenceColumns+` FROM recurrences WHERE status='active' AND next_run <= $1::date ORDER BY next_run,id`, now)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := make([]domain.Recurrence, 0)
	for rows.Next() {
		item, err := r.scan(rows)
		if err != nil {
			return nil, err
		}
		result = append(result, *item)
	}
	return result, rows.Err()
}

func (r *recurrenceRepository) ClaimOccurrence(ctx context.Context, recurrenceID, runDate string) (bool, error) {
	result, err := r.Pool.Exec(ctx, `INSERT INTO recurrence_occurrences(recurrence_id,run_date) VALUES($1,$2) ON CONFLICT DO NOTHING`, recurrenceID, runDate)
	return result.RowsAffected() == 1, err
}

func (r *recurrenceRepository) CompleteOccurrence(ctx context.Context, recurrenceID, runDate, billID, nextRun string) error {
	tx, err := r.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if _, err := tx.Exec(ctx, `UPDATE recurrence_occurrences SET bill_id=$1 WHERE recurrence_id=$2 AND run_date=$3`, billID, recurrenceID, runDate); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `UPDATE recurrences SET next_run=$1,last_generated_on=$2,updated_at=NOW() WHERE id=$3`, nextRun, runDate, recurrenceID); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (r *recurrenceRepository) ReleaseOccurrence(ctx context.Context, recurrenceID, runDate string) error {
	_, err := r.Pool.Exec(ctx, `DELETE FROM recurrence_occurrences WHERE recurrence_id=$1 AND run_date=$2 AND bill_id IS NULL`, recurrenceID, runDate)
	return err
}
