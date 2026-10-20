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

type groupRepository struct{ Pool *pgxpool.Pool }

func NewGroupRepository(pool *pgxpool.Pool) domain.GroupRepository {
	return &groupRepository{Pool: pool}
}

func (r *groupRepository) Create(ctx context.Context, group *domain.Group) error {
	if group.ID == "" {
		group.ID = uuid.NewString()
	}
	_, err := r.Pool.Exec(ctx, `INSERT INTO groups(id,owner_id,name,created_at,updated_at) VALUES($1,$2,$3,$4,$5)`, group.ID, group.OwnerID, group.Name, group.CreatedAt, group.UpdatedAt)
	if err != nil {
		return err
	}
	_, err = r.Pool.Exec(ctx, `
		INSERT INTO group_members(id,group_id,user_id,display_name,role)
		VALUES($1,$2,$3,COALESCE((SELECT NULLIF(TRIM(name),'') FROM users WHERE id=$3),'Owner'),'owner')
	`, uuid.NewString(), group.ID, group.OwnerID)
	return err
}

func (r *groupRepository) ListByUserID(ctx context.Context, userID string) ([]domain.Group, error) {
	rows, err := r.Pool.Query(ctx, `
		SELECT g.id,g.owner_id,g.name,g.created_at,g.updated_at
		FROM groups g
		WHERE g.owner_id=$1 OR EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id=g.id AND gm.user_id=$1)
		ORDER BY g.updated_at DESC,g.id DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	groups := make([]domain.Group, 0)
	for rows.Next() {
		var group domain.Group
		if err := rows.Scan(&group.ID, &group.OwnerID, &group.Name, &group.CreatedAt, &group.UpdatedAt); err != nil {
			return nil, err
		}
		group.Members, err = r.members(ctx, group.ID)
		if err != nil {
			return nil, err
		}
		groups = append(groups, group)
	}
	return groups, rows.Err()
}

func (r *groupRepository) members(ctx context.Context, groupID string) ([]domain.GroupMember, error) {
	rows, err := r.Pool.Query(ctx, `SELECT id,group_id,user_id,display_name,role,joined_at FROM group_members WHERE group_id=$1 ORDER BY joined_at,id`, groupID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := make([]domain.GroupMember, 0)
	for rows.Next() {
		var member domain.GroupMember
		if err := rows.Scan(&member.ID, &member.GroupID, &member.UserID, &member.DisplayName, &member.Role, &member.JoinedAt); err != nil {
			return nil, err
		}
		result = append(result, member)
	}
	return result, rows.Err()
}

func (r *groupRepository) GetDetail(ctx context.Context, userID, groupID string) (*domain.GroupDetail, error) {
	var detail domain.GroupDetail
	err := r.Pool.QueryRow(ctx, `
		SELECT g.id,g.owner_id,g.name,g.created_at,g.updated_at
		FROM groups g
		WHERE g.id=$1 AND (g.owner_id=$2 OR EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id=g.id AND gm.user_id=$2))
	`, groupID, userID).Scan(&detail.Group.ID, &detail.Group.OwnerID, &detail.Group.Name, &detail.Group.CreatedAt, &detail.Group.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	detail.Group.Members, err = r.members(ctx, groupID)
	if err != nil {
		return nil, err
	}

	rows, err := r.Pool.Query(ctx, `
		SELECT b.id,b.title,b.merchant,b.grand_total,b.status,b.discount,b.bill_date::text,b.created_at,
		COALESCE((SELECT name FROM persons WHERE bill_id=b.id AND is_payer LIMIT 1),'')
		FROM bills b WHERE b.group_id=$1 ORDER BY b.created_at DESC,b.id DESC
	`, groupID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var summary domain.BillSummary
		if err := rows.Scan(&summary.ID, &summary.Title, &summary.Merchant, &summary.GrandTotal, &summary.Status, &summary.Discount, &summary.BillDate, &summary.CreatedAt, &summary.PayerName); err != nil {
			return nil, err
		}
		detail.Bills = append(detail.Bills, summary)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	rows.Close()

	rows, err = r.Pool.Query(ctx, `
		SELECT gm.id,gm.user_id,gm.display_name,
		COALESCE(SUM(CASE WHEN gbm.person_id=p.to_person_id THEN p.amount ELSE 0 END),0),
		COALESCE(SUM(CASE WHEN gbm.person_id=p.from_person_id THEN p.amount ELSE 0 END),0)
		FROM group_members gm
		LEFT JOIN group_bill_members gbm ON gbm.group_member_id=gm.id AND gbm.group_id=$1
		LEFT JOIN payments p ON p.bill_id=gbm.bill_id AND p.is_paid=false
		WHERE gm.group_id=$1
		GROUP BY gm.id,gm.user_id,gm.display_name ORDER BY gm.joined_at,gm.id
	`, groupID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var balance domain.GroupBalance
		if err := rows.Scan(&balance.MemberID, &balance.UserID, &balance.DisplayName, &balance.Paid, &balance.Owed); err != nil {
			return nil, err
		}
		balance.Net = balance.Paid - balance.Owed
		detail.Balances = append(detail.Balances, balance)
	}
	return &detail, rows.Err()
}

func (r *groupRepository) Delete(ctx context.Context, userID, groupID string) error {
	tx, err := r.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	result, err := tx.Exec(ctx, `UPDATE bills SET group_id=NULL,updated_at=NOW() WHERE group_id=$1 AND EXISTS(SELECT 1 FROM groups WHERE id=$1 AND owner_id=$2)`, groupID, userID)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		var exists bool
		if err := tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM groups WHERE id=$1 AND owner_id=$2)`, groupID, userID).Scan(&exists); err != nil {
			return err
		}
		if !exists {
			return domain.ErrNotFound
		}
	}
	if _, err := tx.Exec(ctx, `DELETE FROM groups WHERE id=$1 AND owner_id=$2`, groupID, userID); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (r *groupRepository) GetDefaultSplit(ctx context.Context, userID, groupID string) (*domain.GroupDefaultSplit, error) {
	var split domain.GroupDefaultSplit
	err := r.Pool.QueryRow(ctx, `SELECT gds.group_id,gds.split_type,gds.configuration FROM group_default_splits gds JOIN groups g ON g.id=gds.group_id WHERE gds.group_id=$1 AND (g.owner_id=$2 OR EXISTS(SELECT 1 FROM group_members WHERE group_id=$1 AND user_id=$2))`, groupID, userID).Scan(&split.GroupID, &split.SplitType, &split.Configuration)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	return &split, err
}

func (r *groupRepository) SetDefaultSplit(ctx context.Context, userID, groupID string, split *domain.GroupDefaultSplit) error {
	var owner string
	if err := r.Pool.QueryRow(ctx, `SELECT owner_id FROM groups WHERE id=$1`, groupID).Scan(&owner); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return domain.ErrNotFound
		}
		return err
	}
	if owner != userID {
		return domain.ErrNotFound
	}
	_, err := r.Pool.Exec(ctx, `INSERT INTO group_default_splits(group_id,split_type,configuration,updated_at) VALUES($1,$2,$3,NOW()) ON CONFLICT(group_id) DO UPDATE SET split_type=EXCLUDED.split_type,configuration=EXCLUDED.configuration,updated_at=NOW()`, groupID, split.SplitType, split.Configuration)
	return err
}

func (r *groupRepository) AddMember(ctx context.Context, groupID string, member *domain.GroupMember) error {
	if member.ID == "" {
		member.ID = uuid.NewString()
	}
	_, err := r.Pool.Exec(ctx, `INSERT INTO group_members(id,group_id,user_id,display_name,role) VALUES($1,$2,NULLIF($3,'')::uuid,$4,'member')`, member.ID, groupID, valueOrEmpty(member.UserID), member.DisplayName)
	return err
}

func valueOrEmpty(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func (r *groupRepository) RemoveMember(ctx context.Context, userID, groupID, memberID string) error {
	result, err := r.Pool.Exec(ctx, `DELETE FROM group_members WHERE id=$1 AND group_id=$2 AND EXISTS(SELECT 1 FROM groups WHERE id=$2 AND owner_id=$3) AND role <> 'owner'`, memberID, groupID, userID)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *groupRepository) AttachBill(ctx context.Context, userID, groupID, billID string, members []domain.GroupBillMemberRequest) error {
	tx, err := r.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	var owner string
	if err := tx.QueryRow(ctx, `SELECT owner_id FROM groups WHERE id=$1 AND (owner_id=$2 OR EXISTS(SELECT 1 FROM group_members WHERE group_id=$1 AND user_id=$2))`, groupID, userID).Scan(&owner); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return domain.ErrNotFound
		}
		return err
	}
	var billOwner string
	if err := tx.QueryRow(ctx, `SELECT user_id FROM bills WHERE id=$1`, billID).Scan(&billOwner); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return domain.ErrNotFound
		}
		return err
	}
	if billOwner != userID {
		return domain.ErrNotFound
	}
	if _, err := tx.Exec(ctx, `UPDATE bills SET group_id=$1,updated_at=NOW() WHERE id=$2`, groupID, billID); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `DELETE FROM group_bill_members WHERE group_id=$1 AND bill_id=$2`, groupID, billID); err != nil {
		return err
	}
	for _, member := range members {
		if _, err := tx.Exec(ctx, `
			INSERT INTO group_bill_members(group_id,bill_id,group_member_id,person_id)
			SELECT $1,$2,gm.id,p.id FROM group_members gm JOIN persons p ON p.id=$4
			WHERE gm.id=$3 AND gm.group_id=$1 AND p.bill_id=$2
		`, groupID, billID, member.GroupMemberID, member.PersonID); err != nil {
			return fmt.Errorf("attach participant: %w", err)
		}
	}
	return tx.Commit(ctx)
}
