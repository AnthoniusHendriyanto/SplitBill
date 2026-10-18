package http

import (
	"bytes"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// Regression: writeInternalError must keep the cause in the server log while the client only ever
// sees a generic message. Before this, every 5xx was an unexplained dead end with no server trace.
func TestInternalErrorLogsCauseWithoutLeakingIt(t *testing.T) {
	const secret = "pq: duplicate key value violates unique constraint \"users_email_key\""

	var logged bytes.Buffer
	log.SetOutput(&logged)
	defer log.SetOutput(nil)

	rec := httptest.NewRecorder()
	writeInternalError(rec, errors.New(secret))

	if !strings.Contains(logged.String(), secret) {
		t.Fatalf("cause not logged: %q", logged.String())
	}

	if strings.Contains(rec.Body.String(), secret) {
		t.Fatalf("internal detail leaked to client: %s", rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), "INTERNAL_ERROR") {
		t.Fatalf("unexpected error body: %s", rec.Body.String())
	}
	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want 500", rec.Code)
	}

	var payload map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("error body is not JSON: %s", rec.Body.String())
	}
}
