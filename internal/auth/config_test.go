package auth

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadConfig_NotExist(t *testing.T) {
	dir := t.TempDir()
	cfg, err := LoadConfig(dir)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cfg == nil {
		t.Fatal("expected non-nil config")
	}
	if len(cfg.Profiles) != 0 {
		t.Errorf("expected empty profiles, got %d", len(cfg.Profiles))
	}
}

func TestLoadConfig_Valid(t *testing.T) {
	dir := t.TempDir()
	data := `{"profiles":{"abc123":{"totp_secret":"JBSWY3DPEHPK3PXP","name":"test profile"}}}`
	if err := os.WriteFile(filepath.Join(dir, "profiles.json"), []byte(data), 0600); err != nil {
		t.Fatal(err)
	}

	cfg, err := LoadConfig(dir)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(cfg.Profiles) != 1 {
		t.Fatalf("expected 1 profile, got %d", len(cfg.Profiles))
	}
	p := cfg.Profiles["abc123"]
	if p.TOTPSecret != "JBSWY3DPEHPK3PXP" {
		t.Errorf("expected TOTP secret JBSWY3DPEHPK3PXP, got %s", p.TOTPSecret)
	}
	if p.Name != "test profile" {
		t.Errorf("expected name 'test profile', got %s", p.Name)
	}
}

func TestLoadConfig_InvalidJSON(t *testing.T) {
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, "profiles.json"), []byte("{bad json"), 0600); err != nil {
		t.Fatal(err)
	}

	_, err := LoadConfig(dir)
	if err == nil {
		t.Fatal("expected error for invalid JSON")
	}
}

func TestSaveConfig(t *testing.T) {
	dir := t.TempDir()
	cfg := &Config{
		Profiles: map[string]ProfileConfig{
			"prof1": {TOTPSecret: "SECRET123", Name: "My Profile"},
		},
	}

	if err := SaveConfig(dir, cfg); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Read it back
	loaded, err := LoadConfig(dir)
	if err != nil {
		t.Fatalf("unexpected error loading saved config: %v", err)
	}
	if loaded.Profiles["prof1"].TOTPSecret != "SECRET123" {
		t.Errorf("expected SECRET123, got %s", loaded.Profiles["prof1"].TOTPSecret)
	}
}

func TestGetTOTPSecret(t *testing.T) {
	cfg := &Config{
		Profiles: map[string]ProfileConfig{
			"prof1": {TOTPSecret: "MYSECRET"},
		},
	}

	if got := cfg.GetTOTPSecret("prof1"); got != "MYSECRET" {
		t.Errorf("expected MYSECRET, got %s", got)
	}
}

func TestGetTOTPSecret_NoProfile(t *testing.T) {
	cfg := &Config{Profiles: make(map[string]ProfileConfig)}

	if got := cfg.GetTOTPSecret("nonexistent"); got != "" {
		t.Errorf("expected empty string, got %s", got)
	}
}

func TestSetTOTPSecret(t *testing.T) {
	cfg := &Config{Profiles: make(map[string]ProfileConfig)}
	cfg.SetTOTPSecret("prof1", "NEWSECRET")

	if got := cfg.GetTOTPSecret("prof1"); got != "NEWSECRET" {
		t.Errorf("expected NEWSECRET, got %s", got)
	}
}

func TestCookieDir(t *testing.T) {
	dir := "/home/user/.mega_facebook"
	expected := filepath.Join(dir, "cookies")
	if got := CookieDir(dir); got != expected {
		t.Errorf("expected %s, got %s", expected, got)
	}
}

func TestCookiePath(t *testing.T) {
	dir := "/home/user/.mega_facebook"
	expected := filepath.Join(dir, "cookies", "prof1.json")
	if got := CookiePath(dir, "prof1"); got != expected {
		t.Errorf("expected %s, got %s", expected, got)
	}
}
