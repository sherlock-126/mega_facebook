package browser

import (
	"testing"
)

func TestConnect_EmptyWSURL(t *testing.T) {
	_, err := Connect("")
	if err == nil {
		t.Fatal("expected error for empty WebSocket URL")
	}
	if got := err.Error(); got != "empty WebSocket URL: cannot connect to browser" {
		t.Fatalf("unexpected error: %s", got)
	}
}

func TestConnect_InvalidWSURL(t *testing.T) {
	_, err := Connect("not-a-valid-url")
	if err == nil {
		t.Fatal("expected error for invalid WebSocket URL")
	}
}

func TestConnect_ConnectionRefused(t *testing.T) {
	// Use a valid-looking WS URL that nothing is listening on
	_, err := Connect("ws://127.0.0.1:19999/devtools/browser/fake")
	if err == nil {
		t.Fatal("expected error when connection is refused")
	}
}

func TestContainsLoginPath(t *testing.T) {
	tests := []struct {
		url  string
		want bool
	}{
		{"https://www.facebook.com/login/?next=...", true},
		{"https://www.facebook.com/checkpoint/...", true},
		{"https://www.facebook.com/recover/...", true},
		{"https://www.facebook.com/", false},
		{"https://www.facebook.com/home.php", false},
		{"", false},
	}

	for _, tt := range tests {
		got := containsLoginPath(tt.url)
		if got != tt.want {
			t.Errorf("containsLoginPath(%q) = %v, want %v", tt.url, got, tt.want)
		}
	}
}
