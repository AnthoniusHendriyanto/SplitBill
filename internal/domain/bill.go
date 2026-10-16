package domain

import (
	"math"
	"time"
)

type Bill struct {
	RequestKey    string    `json:"-"`
	RequestHash   string    `json:"-"`
	ID            string    `json:"id"`
	UserID        string    `json:"user_id"`
	Title         string    `json:"title"`
	Merchant      string    `json:"merchant"`
	TotalAmount   float64   `json:"total_amount"`
	ServiceCharge float64   `json:"service_charge"`
	ServiceMode   string    `json:"service_mode"`
	Tax           float64   `json:"tax"`
	TaxMode       string    `json:"tax_mode"`
	Discount      float64   `json:"discount"`
	GrandTotal    float64   `json:"grand_total"`
	Status        string    `json:"status"`
	SplitType     string    `json:"split_type"`
	BillDate      string    `json:"bill_date"`
	Items         []Item    `json:"items"`
	Persons       []Person  `json:"persons"`
	Payments      []Payment `json:"payments"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

func (b Bill) CalculateGrandTotal() float64 {
	svc := b.ServiceCharge
	if b.ServiceMode == "percent" {
		svc = b.TotalAmount * b.ServiceCharge / 100
	}
	tax := b.Tax
	if b.TaxMode == "percent" {
		tax = b.TotalAmount * b.Tax / 100
	}
	return math.Round((b.TotalAmount+svc+tax-b.Discount)*100) / 100
}

type Item struct {
	AssignedPersonIDs []string  `json:"assigned_person_ids,omitempty"`
	ID                string    `json:"id"`
	BillID            string    `json:"bill_id"`
	Name              string    `json:"name"`
	Price             float64   `json:"price"`
	Quantity          int       `json:"quantity,omitempty"`
	AssignedTo        []string  `json:"assigned_to,omitempty"`
	CreatedAt         time.Time `json:"created_at"`
}

type Person struct {
	CustomAmount float64     `json:"custom_amount"`
	ShareAmount  *float64    `json:"share_amount,omitempty"`
	ID           string      `json:"id"`
	BillID       string      `json:"bill_id"`
	UserID       *string     `json:"user_id,omitempty"`
	Name         string      `json:"name"`
	Email        string      `json:"email,omitempty"`
	IsPayer      bool        `json:"is_payer"`
	Percentage   float64     `json:"percentage"`
	PaymentInfo  interface{} `json:"payment_info,omitempty"`
	CreatedAt    time.Time   `json:"created_at"`
}

type ItemAssignment struct {
	ID        string    `json:"id"`
	ItemID    string    `json:"item_id"`
	PersonID  string    `json:"person_id"`
	CreatedAt time.Time `json:"created_at"`
}

type Payment struct {
	ID           string     `json:"id"`
	BillID       string     `json:"bill_id"`
	FromPersonID string     `json:"from_person_id"`
	ToPersonID   string     `json:"to_person_id"`
	FromPerson   string     `json:"from_person"`
	ToPerson     string     `json:"to_person"`
	Amount       float64    `json:"amount"`
	IsPaid       bool       `json:"is_paid"`
	PaidAt       *time.Time `json:"paid_at,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
}

type SplitType string

const (
	SplitTypeEqual       SplitType = "equal"
	SplitTypeCustom      SplitType = "custom"
	SplitTypePercentage  SplitType = "percentage"
	SplitTypeSharedItems SplitType = "shared_items"
)

type CreateBillRequest struct {
	RequestKey    string              `json:"request_key" validate:"required,uuid"`
	Title         string              `json:"title" validate:"required,max=255"`
	Merchant      string              `json:"merchant"`
	Items         []ItemRequest       `json:"items" validate:"required,min=1,max=500,dive"`
	Persons       []PersonRequest     `json:"persons" validate:"required,min=2,max=100,dive"`
	SplitType     string              `json:"split_type" validate:"required"`
	Assignments   []AssignmentRequest `json:"assignments"`
	ServiceCharge float64             `json:"service_charge"`
	ServiceMode   string              `json:"service_mode"`
	Tax           float64             `json:"tax"`
	TaxMode       string              `json:"tax_mode"`
	Discount      float64             `json:"discount"`
	Status        string              `json:"status"`
	BillDate      string              `json:"bill_date"`
}

type ItemRequest struct {
	ID       string  `json:"id,omitempty"`
	Name     string  `json:"name" validate:"required,max=255"`
	Price    float64 `json:"price" validate:"min=0"`
	Quantity int     `json:"quantity,omitempty"`
}

type PersonRequest struct {
	UserID       string      `json:"user_id,omitempty" validate:"omitempty,uuid"`
	CustomAmount float64     `json:"custom_amount"`
	ID           string      `json:"id,omitempty"`
	Name         string      `json:"name" validate:"required,max=100"`
	Email        string      `json:"email,omitempty"`
	IsPayer      bool        `json:"is_payer"`
	Percentage   float64     `json:"percentage"`
	PaymentInfo  interface{} `json:"payment_info,omitempty"`
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
	Merchant    string    `json:"merchant,omitempty"`
	GrandTotal  float64   `json:"grand_total"`
	UserShare   float64   `json:"user_share"`
	Receivable  float64   `json:"receivable"`
	Payable     float64   `json:"payable"`
	PersonCount int       `json:"person_count"`
	Status      string    `json:"status"`
	Discount    float64   `json:"discount"`
	PayerName   string    `json:"payer_name"`
	BillDate    string    `json:"bill_date"`
	CreatedAt   time.Time `json:"created_at"`
}

type Pagination struct {
	Page       int `json:"page"`
	Limit      int `json:"limit"`
	TotalItems int `json:"total_items"`
	TotalPages int `json:"total_pages"`
}

type UserPaymentSummary struct {
	UserShare  float64
	Receivable float64
	Payable    float64
}

type BillDetailResponse struct {
	Bill              Bill               `json:"bill"`
	SettlementSummary map[string]float64 `json:"settlement_summary"`
}
