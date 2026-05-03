package domain

import "time"

type Bill struct {
	ID            string    `json:"id"`
	Title         string    `json:"title"`
	Items         []Item    `json:"items"`
	Persons       []Person  `json:"persons"`
	ServiceCharge float64   `json:"service_charge"`
	Tax           float64   `json:"tax"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type Item struct {
	ID        string    `json:"id"`
	BillID    string    `json:"bill_id"`
	Name      string    `json:"name"`
	Price     float64   `json:"price"`
	CreatedAt time.Time `json:"created_at"`
}

type Person struct {
	ID        string    `json:"id"`
	BillID    string    `json:"bill_id"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"created_at"`
}

type ItemAssignment struct {
	ID        string    `json:"id"`
	ItemID    string    `json:"item_id"`
	PersonID  string    `json:"person_id"`
	CreatedAt time.Time `json:"created_at"`
}
