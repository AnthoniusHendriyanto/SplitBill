package http

import (
	"encoding/csv"
	"io"
	"mime/multipart"
	"net/http"
	"strconv"
	"strings"
)

type SplitwiseImportRow struct {
	Date        string  `json:"date"`
	Description string  `json:"description"`
	Amount      float64 `json:"amount"`
	Currency    string  `json:"currency"`
	Category    string  `json:"category,omitempty"`
	Notes       string  `json:"notes,omitempty"`
}

type ImportHandler struct{}

func NewImportHandler() *ImportHandler { return &ImportHandler{} }

func (h *ImportHandler) Splitwise(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(5 << 20); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_INPUT", "Upload a CSV file up to 5 MB")
		return
	}
	file, _, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_INPUT", "CSV file is required")
		return
	}
	defer func(file multipart.File) { _ = file.Close() }(file)
	reader := csv.NewReader(file)
	header, err := reader.Read()
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_INPUT", "CSV header is required")
		return
	}
	columns := map[string]int{}
	for i, value := range header {
		columns[strings.ToLower(strings.TrimSpace(value))] = i
	}
	descriptionColumn := firstColumn(columns, "description", "expense", "name")
	amountColumn := firstColumn(columns, "cost", "amount", "total")
	if descriptionColumn < 0 || amountColumn < 0 {
		writeError(w, http.StatusBadRequest, "INVALID_INPUT", "CSV needs description and amount columns")
		return
	}
	rows := make([]SplitwiseImportRow, 0, 100)
	for len(rows) < 1000 {
		values, readErr := reader.Read()
		if readErr == io.EOF {
			break
		}
		if readErr != nil {
			writeError(w, http.StatusBadRequest, "INVALID_INPUT", "Invalid CSV row")
			return
		}
		amount, parseErr := strconv.ParseFloat(strings.ReplaceAll(strings.TrimSpace(valueAt(values, amountColumn)), ",", ""), 64)
		if parseErr != nil || amount < 0 {
			continue
		}
		rows = append(rows, SplitwiseImportRow{Date: valueAt(values, firstColumn(columns, "date")), Description: valueAt(values, descriptionColumn), Amount: amount, Currency: valueAt(values, firstColumn(columns, "currency")), Category: valueAt(values, firstColumn(columns, "category")), Notes: valueAt(values, firstColumn(columns, "notes", "note"))})
	}
	writeSuccess(w, http.StatusOK, map[string]interface{}{"rows": rows, "count": len(rows), "truncated": len(rows) == 1000})
}

func firstColumn(columns map[string]int, names ...string) int {
	for _, name := range names {
		if index, ok := columns[name]; ok {
			return index
		}
	}
	return -1
}
func valueAt(values []string, index int) string {
	if index < 0 || index >= len(values) {
		return ""
	}
	return strings.TrimSpace(values[index])
}
