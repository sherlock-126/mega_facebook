package auth

import (
	"testing"
)

func TestClassifyURL_LoginPaths(t *testing.T) {
	tests := []struct {
		url  string
		want SessionState
	}{
		{"https://www.facebook.com/login/?next=...", StateLoggedOut},
		{"https://www.facebook.com/login/", StateLoggedOut},
		{"https://www.facebook.com/recover/initiate/", StateLoggedOut},
		{"https://www.facebook.com/checkpoint/1234/", StateCheckpoint},
		{"https://www.facebook.com/checkpoint/block/", StateCheckpoint},
	}

	for _, tt := range tests {
		got := ClassifyURL(tt.url)
		if got != tt.want {
			t.Errorf("ClassifyURL(%q) = %q, want %q", tt.url, got, tt.want)
		}
	}
}

func TestClassifyURL_NormalPaths(t *testing.T) {
	tests := []struct {
		url string
	}{
		{"https://www.facebook.com/"},
		{"https://www.facebook.com/home.php"},
		{"https://www.facebook.com/profile.php?id=123"},
		{""},
	}

	for _, tt := range tests {
		got := ClassifyURL(tt.url)
		if got != "" {
			t.Errorf("ClassifyURL(%q) = %q, want empty (inconclusive)", tt.url, got)
		}
	}
}

func TestClassifyURL_CaseInsensitive(t *testing.T) {
	got := ClassifyURL("https://www.facebook.com/LOGIN/")
	if got != StateLoggedOut {
		t.Errorf("ClassifyURL with uppercase LOGIN = %q, want %q", got, StateLoggedOut)
	}
}

func TestSessionStateConstants(t *testing.T) {
	// Verify the string values are what we expect
	if StateLoggedIn != "logged_in" {
		t.Errorf("StateLoggedIn = %q", StateLoggedIn)
	}
	if StateLoggedOut != "logged_out" {
		t.Errorf("StateLoggedOut = %q", StateLoggedOut)
	}
	if StateCheckpoint != "checkpoint" {
		t.Errorf("StateCheckpoint = %q", StateCheckpoint)
	}
	if State2FARequired != "2fa_required" {
		t.Errorf("State2FARequired = %q", State2FARequired)
	}
}
