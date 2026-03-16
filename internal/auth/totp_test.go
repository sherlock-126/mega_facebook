package auth

import (
	"testing"
)

func TestGenerateTOTP_ValidSecret(t *testing.T) {
	// JBSWY3DPEHPK3PXP is a well-known test base32 secret
	code, err := GenerateTOTP("JBSWY3DPEHPK3PXP")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(code) != 6 {
		t.Errorf("expected 6-digit code, got %q (len %d)", code, len(code))
	}
	// Verify all digits
	for _, c := range code {
		if c < '0' || c > '9' {
			t.Errorf("expected digit, got %c", c)
		}
	}
}

func TestGenerateTOTP_InvalidSecret(t *testing.T) {
	_, err := GenerateTOTP("!!!INVALID!!!")
	if err == nil {
		t.Fatal("expected error for invalid base32 secret")
	}
}

func TestGenerateTOTP_EmptySecret(t *testing.T) {
	_, err := GenerateTOTP("")
	if err == nil {
		t.Fatal("expected error for empty secret")
	}
}

func TestGenerateTOTP_WhitespaceInSecret(t *testing.T) {
	code, err := GenerateTOTP("  JBSWY3DPEHPK3PXP  ")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(code) != 6 {
		t.Errorf("expected 6-digit code, got %q", code)
	}
}
