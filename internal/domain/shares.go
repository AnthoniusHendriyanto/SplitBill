package domain

import (
	"fmt"
	"math"
	"strings"
)

// CalculateShares allocates final payable cents; equal fractional remainders favor input order.
func CalculateShares(b Bill, items []Item, people []Person, assignments []ItemAssignment) ([]float64, error) {
	invalid := func(message string) ([]float64, error) { return nil, fmt.Errorf("%w: %s", ErrInvalidInput, message) }
	money := func(v float64) bool {
		return !math.IsNaN(v) && !math.IsInf(v, 0) && v >= 0 && v <= 1e10 && math.Abs(v*100-math.Round(v*100)) < 0.00001
	}
	if len(items) == 0 || len(people) < 2 {
		return invalid("add items and at least two people")
	}
	if b.ServiceMode != "percent" && b.ServiceMode != "amount" || b.TaxMode != "percent" && b.TaxMode != "amount" {
		return invalid("invalid fee mode")
	}
	if !money(b.TotalAmount) || !money(b.Tax) || !money(b.ServiceCharge) || !money(b.Discount) || !money(b.CalculateGrandTotal()) {
		return invalid("invalid bill amounts")
	}
	itemIDs := map[string]bool{}
	personIDs := map[string]int{}
	payers := 0
	for _, item := range items {
		if item.ID == "" || itemIDs[item.ID] || strings.TrimSpace(item.Name) == "" || !money(item.Price) || item.Quantity < 1 || item.Quantity > 100000 {
			return invalid("invalid or duplicate item")
		}
		itemIDs[item.ID] = true
	}
	for i, p := range people {
		if p.ID == "" || strings.TrimSpace(p.Name) == "" || !money(p.CustomAmount) || !money(p.Percentage) || p.Percentage > 100 {
			return invalid("invalid person")
		}
		if _, ok := personIDs[p.ID]; ok {
			return invalid("duplicate person")
		}
		personIDs[p.ID] = i
		if p.IsPayer {
			payers++
		}
	}
	if payers != 1 {
		return invalid("select exactly one payer")
	}
	assigned := map[string][]int{}
	pairs := map[string]bool{}
	for _, a := range assignments {
		i, ok := personIDs[a.PersonID]
		key := a.ItemID + ":" + a.PersonID
		if !ok || !itemIDs[a.ItemID] || pairs[key] {
			return invalid("invalid or duplicate assignment")
		}
		pairs[key] = true
		assigned[a.ItemID] = append(assigned[a.ItemID], i)
	}
	weights := make([]float64, len(people))
	total := b.CalculateGrandTotal()
	switch b.SplitType {
	case "equal":
		for i := range weights {
			weights[i] = 1
		}
	case "percentage":
		sum := 0.0
		for i, p := range people {
			weights[i] = p.Percentage
			sum += p.Percentage
		}
		if math.Abs(sum-100) > 0.000001 {
			return invalid("percentages must sum to 100")
		}
	case "custom":
		sum := int64(0)
		for i, p := range people {
			weights[i] = math.Round(p.CustomAmount*100) / 100
			sum += int64(math.Round(p.CustomAmount * 100))
		}
		if sum != int64(math.Round(total*100)) {
			return invalid("custom final shares must equal bill total")
		}
		return weights, nil
	case "shared_items":
		for _, item := range items {
			indices := assigned[item.ID]
			if len(indices) == 0 {
				for i := range people {
					indices = append(indices, i)
				}
			}
			for _, i := range indices {
				weights[i] += item.Price * float64(item.Quantity) / float64(len(indices))
			}
		}
	default:
		return invalid("invalid split type")
	}
	sum := 0.0
	for _, w := range weights {
		sum += w
	}
	if sum == 0 {
		for i := range weights {
			weights[i] = 1
		}
		sum = float64(len(weights))
	}
	cents := int64(math.Round(total * 100))
	used := int64(0)
	fractions := make([]float64, len(weights))
	for i, w := range weights {
		raw := float64(cents) * w / sum
		floor := math.Floor(raw)
		weights[i] = floor / 100
		used += int64(floor)
		fractions[i] = raw - floor
	}
	for left := cents - used; left > 0; left-- {
		best := 0
		for i := range fractions {
			if fractions[i] > fractions[best] {
				best = i
			}
		}
		weights[best] = math.Round(weights[best]*100+1) / 100
		fractions[best] = -1
	}
	return weights, nil
}
