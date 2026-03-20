package auth

import (
	"os"
	"path/filepath"
	"testing"
)

func TestParseCookieFile_Valid(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "cookies.json")
	data := `[
		{"name":"c_user","value":"12345","domain":".facebook.com","path":"/","httpOnly":true,"secure":true},
		{"name":"xs","value":"abc","domain":".facebook.com","path":"/","httpOnly":true,"secure":true}
	]`
	if err := os.WriteFile(path, []byte(data), 0644); err != nil {
		t.Fatal(err)
	}

	cookies, err := ParseCookieFile(path)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(cookies) != 2 {
		t.Fatalf("expected 2 cookies, got %d", len(cookies))
	}
	if cookies[0].Name != "c_user" {
		t.Errorf("expected c_user, got %s", cookies[0].Name)
	}
	if cookies[0].Domain != ".facebook.com" {
		t.Errorf("expected .facebook.com, got %s", cookies[0].Domain)
	}
}

func TestParseCookieFile_Empty(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "cookies.json")
	if err := os.WriteFile(path, []byte("[]"), 0644); err != nil {
		t.Fatal(err)
	}

	_, err := ParseCookieFile(path)
	if err == nil {
		t.Fatal("expected error for empty cookie array")
	}
}

func TestParseCookieFile_InvalidJSON(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "cookies.json")
	if err := os.WriteFile(path, []byte("{not valid json"), 0644); err != nil {
		t.Fatal(err)
	}

	_, err := ParseCookieFile(path)
	if err == nil {
		t.Fatal("expected error for invalid JSON")
	}
}

func TestParseCookieFile_NotArray(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "cookies.json")
	if err := os.WriteFile(path, []byte(`{"name":"test"}`), 0644); err != nil {
		t.Fatal(err)
	}

	_, err := ParseCookieFile(path)
	if err == nil {
		t.Fatal("expected error for non-array JSON")
	}
}

func TestParseCookieFile_NotExist(t *testing.T) {
	_, err := ParseCookieFile("/nonexistent/cookies.json")
	if err == nil {
		t.Fatal("expected error for missing file")
	}
}

func TestFilterFacebookCookies(t *testing.T) {
	cookies := []Cookie{
		{Name: "c_user", Domain: ".facebook.com"},
		{Name: "other", Domain: ".google.com"},
		{Name: "xs", Domain: ".facebook.com"},
	}

	filtered, skipped := FilterFacebookCookies(cookies)
	if len(filtered) != 2 {
		t.Errorf("expected 2 filtered cookies, got %d", len(filtered))
	}
	if skipped != 1 {
		t.Errorf("expected 1 skipped, got %d", skipped)
	}
}

func TestFilterFacebookCookies_AllFacebook(t *testing.T) {
	cookies := []Cookie{
		{Name: "c_user", Domain: ".facebook.com"},
		{Name: "xs", Domain: ".facebook.com"},
	}

	filtered, skipped := FilterFacebookCookies(cookies)
	if len(filtered) != 2 {
		t.Errorf("expected 2 filtered cookies, got %d", len(filtered))
	}
	if skipped != 0 {
		t.Errorf("expected 0 skipped, got %d", skipped)
	}
}

func TestFilterFacebookCookies_NoneFacebook(t *testing.T) {
	cookies := []Cookie{
		{Name: "other", Domain: ".google.com"},
		{Name: "another", Domain: ".twitter.com"},
	}

	filtered, skipped := FilterFacebookCookies(cookies)
	if len(filtered) != 0 {
		t.Errorf("expected 0 filtered cookies, got %d", len(filtered))
	}
	if skipped != 2 {
		t.Errorf("expected 2 skipped, got %d", skipped)
	}
}

func TestFilterFacebookCookies_SubdomainVariants(t *testing.T) {
	cookies := []Cookie{
		{Name: "a", Domain: ".facebook.com"},
		{Name: "b", Domain: "facebook.com"},
		{Name: "c", Domain: "www.facebook.com"},
		{Name: "d", Domain: "m.facebook.com"},
		{Name: "e", Domain: ".notfacebook.com"},
	}

	filtered, skipped := FilterFacebookCookies(cookies)
	if len(filtered) != 4 {
		t.Errorf("expected 4 filtered cookies, got %d", len(filtered))
	}
	if skipped != 1 {
		t.Errorf("expected 1 skipped, got %d", skipped)
	}
}

func TestWriteCookieFile(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "out.json")
	cookies := []Cookie{
		{Name: "c_user", Value: "12345", Domain: ".facebook.com"},
	}

	if err := WriteCookieFile(path, cookies); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Read back and verify
	loaded, err := ParseCookieFile(path)
	if err != nil {
		t.Fatalf("failed to read back: %v", err)
	}
	if len(loaded) != 1 || loaded[0].Name != "c_user" {
		t.Errorf("cookie round-trip failed")
	}
}

func TestWriteCookieFile_CreateDir(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "subdir", "nested", "cookies.json")
	cookies := []Cookie{
		{Name: "test", Value: "val", Domain: ".facebook.com"},
	}

	if err := WriteCookieFile(path, cookies); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if _, err := os.Stat(path); os.IsNotExist(err) {
		t.Error("expected file to exist")
	}
}

func TestWriteCookieFile_ExistingFile(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "cookies.json")

	// Write first version
	cookies1 := []Cookie{{Name: "old", Value: "1", Domain: ".facebook.com"}}
	if err := WriteCookieFile(path, cookies1); err != nil {
		t.Fatal(err)
	}

	// Overwrite with second version
	cookies2 := []Cookie{{Name: "new", Value: "2", Domain: ".facebook.com"}}
	if err := WriteCookieFile(path, cookies2); err != nil {
		t.Fatal(err)
	}

	loaded, err := ParseCookieFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if len(loaded) != 1 || loaded[0].Name != "new" {
		t.Error("expected overwritten cookies")
	}
}

func TestParseCookieFile_MissingFields(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "cookies.json")
	// Cookies with minimal fields
	data := `[{"name":"test","value":"val"}]`
	if err := os.WriteFile(path, []byte(data), 0644); err != nil {
		t.Fatal(err)
	}

	cookies, err := ParseCookieFile(path)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(cookies) != 1 {
		t.Fatalf("expected 1 cookie, got %d", len(cookies))
	}
	if cookies[0].Domain != "" {
		t.Errorf("expected empty domain, got %s", cookies[0].Domain)
	}
}
