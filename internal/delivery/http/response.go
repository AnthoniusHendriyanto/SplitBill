package http

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/user/split-mate/internal/domain"
)

func writeJSON(w http.ResponseWriter, statusCode int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(v)
}

func writeSuccess(w http.ResponseWriter, statusCode int, data interface{}) {
	if statusCode == http.StatusNoContent {
		w.WriteHeader(statusCode)
		return
	}
	writeJSON(w, statusCode, domain.NewSuccess(data))
}

func writeError(w http.ResponseWriter, statusCode int, code, message string) {
	writeJSON(w, statusCode, domain.NewError(code, message, nil))
}

func writeErrorWithDetails(w http.ResponseWriter, statusCode int, code, message string, details interface{}) {
	writeJSON(w, statusCode, domain.NewError(code, message, details))
}

func writeInternalError(w http.ResponseWriter, err error) {
	// The client gets a generic message so internals never leak, but the cause must reach the
	// server log: without this, every 5xx is an unexplained dead end at all 25 call sites.
	log.Printf("internal error: %v", err)
	writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "An unexpected error occurred")
}
