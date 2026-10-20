package usecase

import (
	"encoding/base64"
	"strings"
	"testing"
)

func TestDecodeReceiptImageAcceptsDataURLAndRejectsNonImages(t *testing.T) {
	encoded := base64.StdEncoding.EncodeToString([]byte("receipt"))
	data, mime, err := decodeReceiptImage("data:image/jpeg;base64,"+encoded, "")
	if err != nil {
		t.Fatalf("decodeReceiptImage() error = %v", err)
	}
	if string(data) != "receipt" || mime != "image/jpeg" {
		t.Fatalf("decoded receipt = %q, %q", data, mime)
	}

	if _, _, err := decodeReceiptImage("data:text/plain;base64,"+encoded, ""); err == nil || !strings.Contains(err.Error(), "receipt must be an image") {
		t.Fatalf("expected non-image rejection, got %v", err)
	}
}

func TestDecodeReceiptImageRejectsOversizedPayload(t *testing.T) {
	encoded := base64.StdEncoding.EncodeToString(make([]byte, 10<<20+1))
	if _, _, err := decodeReceiptImage("data:image/jpeg;base64,"+encoded, ""); err == nil {
		t.Fatal("expected oversized receipt to be rejected")
	}
}
