package domain

import "time"

type Bill struct {
	ID            string    `json:"id"`
	UserID        string    `json:"user_id"`
	Title         string    `json:"title"`
	TotalAmount   float64   `json:"total_amount"`
	ServiceCharge float64   `json:"service_charge"`
	Tax           float64   `json:"tax"`
	GrandTotal    float64   `json:"grand_total"`
	SplitType     string    `json:"split_type"`
	Items         []Item    `json:"items"`
	Persons       []Person  `json:"persons"`
	Payments      []Payment `json:"payments"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type Item struct {
	ID          string     `json:"id"`
	BillID      string     `json:"bill_id"`
	Name        string     `json:"name"`
	Price       float64    `json:"price"`
	AssignedTo  []string   `json:"assigned_to,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
}

type Person struct {
	ID          string    `json:"id"`
	BillID      string    `json:"bill_id"`
	Name        string    `json:"name"`
	IsPayer     bool      `json:"is_payer"`
	Percentage  float64   `json:"percentage"`
	CreatedAt   time.Time `json:"created_at"`
}

type ItemAssignment struct {
	ID        string    `json:"id"`
	ItemID    string    `json:"item_id"`
	PersonID  string    `json:"person_id"`
	CreatedAt time.Time `json:"created_at"`
}

type Payment struct {
	ID          string    `json:"id"`
	BillID      string    `json:"bill_id"`
	FromPersonID string   `json:"from_person_id"`
	ToPersonID   string   `json:"to_person_id"`
	FromPerson  string    `json:"from_person"`
	ToPerson    string    `json:"to_person"`
	Amount      float64   `json:"amount"`
	IsPaid      bool      `json:"is_paid"`
	PaidAt      *time.Time `json:"paid_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
}

type SplitType string

const (
	SplitTypeEqual        SplitType = "equal"
	SplitTypeCustom       SplitType = "custom"
	SplitTypePercentage   SplitType = "percentage"
	SplitTypeSharedItems  SplitType = "shared_items"
)

type CreateBillRequest struct {
	Title        string            `json:"title" validate:"required"`
	Items        []ItemRequest     `json:"items" validate:"required"`
	Persons      []PersonRequest   `json:"persons" validate:"required,min=2"`
	SplitType    string            `json:"split_type" validate:"required"`
	Assignments  []AssignmentRequest `json:"assignments"`
	ServiceCharge float64          `json:"service_charge"`
	Tax           float64          `json:"tax"`
}

type ItemRequest struct {
	ID    string  `json:"id,omitempty"`
	Name  string  `json:"name" validate:"required"`
	Price float64 `json:"price" validate:"required,min=0"`
}

type PersonRequest struct {
	ID         string  `json:"id,omitempty"`
	Name       string  `json:"name" validate:"required"`
	IsPayer    bool    `json:"is_payer"`
	Percentage float64 `json:"percentage"`
}

type AssignmentRequest struct {
	ItemID   string `json:"item_id" validate:"required"`
	PersonID string `json:"person_id" validate:"required"`
}

type BillListResponse struct {
	Data       []BillSummary `json:"data"`
	Pagination Pagination    `json:"pagination"`
}

type BillSummary struct {
	ID          string    `json:"id"`
	Title       string    `json:"title"`
	GrandTotal  float64   `json:"grand_total"`
	PersonCount int       `json:"person_count"`
	CreatedAt   time.Time `json:"created_at"`
}

type Pagination struct {
	Page        int `json:"page"`
	Limit       int `json:"limit"`
	TotalItems  int `json:"total_items"`
	TotalPages  int `json:"total_pages"`
}

type UpdateBillRequest struct {
	Title        string            `json:"title"`
	Items        []ItemRequest     `json:"items"`
	Persons      []PersonRequest   `json:"persons"`
	SplitType    string            `json:"split_type"`
	Assignments  []AssignmentRequest `json:"assignments"`
}

type BillDetailResponse struct {
	Bill              Bill                      `json:"bill"`
	SettlementSummary map[string]float64       `json:"settlement_summary"`
}

type PaymentSettleRequest struct {
	PaymentID string  `json:"payment_id" validate:"required"`
	Amount    float64 `json:"amount"`
}