package domain

import (
	"math"
	"testing"
)

func TestSharesReconcile(t *testing.T) {
	items := []Item{{ID: "meal", Name: "Meal", Price: 100, Quantity: 3}}
	people := []Person{{ID: "actor", Name: "Actor", Percentage: 20, CustomAmount: 50}, {ID: "payer", Name: "Payer", IsPayer: true, Percentage: 30, CustomAmount: 100}, {ID: "friend", Name: "Friend", Percentage: 50, CustomAmount: 185.01}}
	for _, mode := range []string{"equal", "custom", "percentage", "shared_items"} {
		t.Run(mode, func(t *testing.T) {
			bill := Bill{TotalAmount: 300, ServiceCharge: 10, ServiceMode: "percent", Tax: 20, TaxMode: "amount", Discount: 14.99, SplitType: mode}
			shares, err := CalculateShares(bill, items, people, []ItemAssignment{{ItemID: "meal", PersonID: "friend"}})
			if err != nil {
				t.Fatal(err)
			}
			sum := 0.0
			for _, s := range shares {
				sum += s
			}
			if math.Abs(sum-335.01) > .000001 {
				t.Fatalf("shares=%v sum=%v", shares, sum)
			}
			if mode == "shared_items" && shares[2] != 335.01 {
				t.Fatalf("wrong assignee: %v", shares)
			}
			if mode == "custom" && shares[0] != 50 {
				t.Fatalf("custom includes fees twice: %v", shares)
			}
		})
	}
}
func TestInvalidShares(t *testing.T) {
	b := Bill{TotalAmount: 100, ServiceMode: "amount", TaxMode: "amount", SplitType: "equal"}
	items := []Item{{ID: "i", Name: "meal", Price: 100, Quantity: 1}}
	people := []Person{{ID: "p", Name: "Payer", IsPayer: true}, {ID: "f", Name: "Friend"}}
	if _, err := CalculateShares(b, items, people, []ItemAssignment{{ItemID: "foreign-item", PersonID: "f"}}); err == nil {
		t.Fatal("foreign assignment accepted")
	}
	b.SplitType = "custom"
	if _, err := CalculateShares(b, items, people, nil); err == nil {
		t.Fatal("wrong custom sum accepted")
	}
	b.SplitType = "percentage"
	if _, err := CalculateShares(b, items, people, nil); err == nil {
		t.Fatal("wrong percentage sum accepted")
	}
	b.SplitType = "equal"
	b.Discount = 101
	if _, err := CalculateShares(b, items, people, nil); err == nil {
		t.Fatal("negative total accepted")
	}
}
func TestRemainderAndZeroShares(t *testing.T) {
	b := Bill{TotalAmount: 1, ServiceMode: "amount", TaxMode: "amount", SplitType: "equal"}
	people := []Person{{ID: "p", Name: "Payer", IsPayer: true}, {ID: "a", Name: "A"}, {ID: "b", Name: "B"}}
	shares, err := CalculateShares(b, []Item{{ID: "i", Name: "meal", Price: 1, Quantity: 1}}, people, nil)
	if err != nil || shares[0] != .34 || shares[1] != .33 || shares[2] != .33 {
		t.Fatalf("%v %v", shares, err)
	}
}
