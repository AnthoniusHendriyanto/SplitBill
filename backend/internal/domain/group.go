package domain

import "time"

type Group struct {
	ID        string        `json:"id"`
	OwnerID   string        `json:"owner_id"`
	Name      string        `json:"name"`
	CreatedAt time.Time     `json:"created_at"`
	UpdatedAt time.Time     `json:"updated_at"`
	Members   []GroupMember `json:"members,omitempty"`
}

type GroupMember struct {
	ID          string    `json:"id"`
	GroupID     string    `json:"group_id"`
	UserID      *string   `json:"user_id,omitempty"`
	DisplayName string    `json:"display_name"`
	Role        string    `json:"role"`
	JoinedAt    time.Time `json:"joined_at"`
}

type GroupBalance struct {
	MemberID    string  `json:"member_id"`
	UserID      *string `json:"user_id,omitempty"`
	DisplayName string  `json:"display_name"`
	Paid        float64 `json:"paid"`
	Owed        float64 `json:"owed"`
	Net         float64 `json:"net"`
}

type GroupDetail struct {
	Group    Group          `json:"group"`
	Bills    []BillSummary  `json:"bills"`
	Balances []GroupBalance `json:"balances"`
}

type GroupDefaultSplit struct {
	GroupID       string                 `json:"group_id"`
	SplitType     string                 `json:"split_type"`
	Configuration map[string]interface{} `json:"configuration"`
}

type CreateGroupRequest struct {
	Name string `json:"name" validate:"required,max=120"`
}

type AddGroupMemberRequest struct {
	UserID      string `json:"user_id,omitempty" validate:"omitempty,uuid"`
	DisplayName string `json:"display_name" validate:"required,max=100"`
}

type AttachBillRequest struct {
	Members []GroupBillMemberRequest `json:"members"`
}

type GroupBillMemberRequest struct {
	GroupMemberID string `json:"group_member_id" validate:"required,uuid"`
	PersonID      string `json:"person_id" validate:"required,uuid"`
}
