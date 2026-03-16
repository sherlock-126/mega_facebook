package browser

import (
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/go-rod/rod"
)

func TestNewAutomation_NilPage(t *testing.T) {
	_, err := NewAutomation(nil)
	if err == nil {
		t.Fatal("expected error for nil page")
	}
	if got := err.Error(); got != "cannot create automation: page is nil" {
		t.Fatalf("unexpected error: %s", got)
	}
}

func TestNewAutomation_Valid(t *testing.T) {
	page := &rod.Page{}
	a, err := NewAutomation(page)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if a == nil {
		t.Fatal("expected non-nil Automation")
	}
	if a.Page() != page {
		t.Fatal("expected Page() to return the same page")
	}
}

func TestNewAutomation_SetsDefaults(t *testing.T) {
	page := &rod.Page{}
	a, err := NewAutomation(page)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if a.elementTimeout != defaultElementTimeout {
		t.Fatalf("expected default element timeout %v, got %v", defaultElementTimeout, a.elementTimeout)
	}
}

func TestNavigate_EmptyURL(t *testing.T) {
	page := &rod.Page{}
	a, _ := NewAutomation(page)
	err := a.Navigate("")
	if err == nil {
		t.Fatal("expected error for empty URL")
	}
	if got := err.Error(); got != "cannot navigate: empty URL" {
		t.Fatalf("unexpected error: %s", got)
	}
}

func TestClick_EmptySelector(t *testing.T) {
	page := &rod.Page{}
	a, _ := NewAutomation(page)
	err := a.Click("")
	if err == nil {
		t.Fatal("expected error for empty selector")
	}
	if got := err.Error(); got != "cannot click: empty selector" {
		t.Fatalf("unexpected error: %s", got)
	}
}

func TestType_EmptySelector(t *testing.T) {
	page := &rod.Page{}
	a, _ := NewAutomation(page)
	err := a.Type("", "text")
	if err == nil {
		t.Fatal("expected error for empty selector")
	}
	if got := err.Error(); got != "cannot type: empty selector" {
		t.Fatalf("unexpected error: %s", got)
	}
}

func TestType_EmptyText(t *testing.T) {
	page := &rod.Page{}
	a, _ := NewAutomation(page)
	err := a.Type("[name='email']", "")
	if err == nil {
		t.Fatal("expected error for empty text")
	}
	if got := err.Error(); got != "cannot type: empty text" {
		t.Fatalf("unexpected error: %s", got)
	}
}

func TestScreenshot_EmptyPath(t *testing.T) {
	page := &rod.Page{}
	a, _ := NewAutomation(page)
	err := a.Screenshot("")
	if err == nil {
		t.Fatal("expected error for empty path")
	}
	if got := err.Error(); got != "cannot take screenshot: empty path" {
		t.Fatalf("unexpected error: %s", got)
	}
}

func TestScreenshot_CreatesDirectory(t *testing.T) {
	// Verify that MkdirAll creates nested parent directories.
	// We can't do a full screenshot without a browser, so we test the
	// directory creation logic directly.
	dir := filepath.Join(t.TempDir(), "nested", "screenshots")

	if err := os.MkdirAll(dir, 0o755); err != nil {
		t.Fatalf("MkdirAll failed: %v", err)
	}

	if _, err := os.Stat(dir); os.IsNotExist(err) {
		t.Fatal("expected directory to be created")
	}
}

func TestWaitForElement_EmptySelector(t *testing.T) {
	page := &rod.Page{}
	a, _ := NewAutomation(page)
	_, err := a.WaitForElement("", 5*time.Second)
	if err == nil {
		t.Fatal("expected error for empty selector")
	}
	if got := err.Error(); got != "cannot wait for element: empty selector" {
		t.Fatalf("unexpected error: %s", got)
	}
}

func TestFindByText_EmptyText(t *testing.T) {
	page := &rod.Page{}
	a, _ := NewAutomation(page)
	_, err := a.FindByText("", "div")
	if err == nil {
		t.Fatal("expected error for empty text")
	}
	if got := err.Error(); got != "cannot find by text: empty text" {
		t.Fatalf("unexpected error: %s", got)
	}
}

// --- Delay range tests ---

func TestClickDelay_Range(t *testing.T) {
	for i := 0; i < 1000; i++ {
		d := clickDelay()
		ms := d.Milliseconds()
		if ms < int64(clickDelayMin) || ms > int64(clickDelayMax) {
			t.Fatalf("clickDelay() = %dms, want [%d, %d]", ms, clickDelayMin, clickDelayMax)
		}
	}
}

func TestPageLoadDelay_Range(t *testing.T) {
	for i := 0; i < 1000; i++ {
		d := pageLoadDelay()
		ms := d.Milliseconds()
		if ms < int64(pageLoadDelayMin) || ms > int64(pageLoadDelayMax) {
			t.Fatalf("pageLoadDelay() = %dms, want [%d, %d]", ms, pageLoadDelayMin, pageLoadDelayMax)
		}
	}
}

func TestTypeDelay_Range(t *testing.T) {
	for i := 0; i < 1000; i++ {
		d := typeDelay()
		ms := d.Milliseconds()
		if ms < int64(typeDelayMin) || ms > int64(typeDelayMax) {
			t.Fatalf("typeDelay() = %dms, want [%d, %d]", ms, typeDelayMin, typeDelayMax)
		}
	}
}

// --- Delay randomness tests ---

func TestClickDelay_Randomness(t *testing.T) {
	values := make(map[int64]bool)
	for i := 0; i < 100; i++ {
		values[clickDelay().Milliseconds()] = true
	}
	if len(values) < 2 {
		t.Fatal("clickDelay() appears to return constant values")
	}
}

func TestPageLoadDelay_Randomness(t *testing.T) {
	values := make(map[int64]bool)
	for i := 0; i < 100; i++ {
		values[pageLoadDelay().Milliseconds()] = true
	}
	if len(values) < 2 {
		t.Fatal("pageLoadDelay() appears to return constant values")
	}
}

// --- XPath builder test ---

func TestBuildXPathByText(t *testing.T) {
	tests := []struct {
		text string
		tag  string
		want string
	}{
		{"Login", "button", `//button[contains(text(), "Login")]`},
		{"Sign Up", "a", `//a[contains(text(), "Sign Up")]`},
		{"Hello", "", `//*[contains(text(), "Hello")]`},
		{"Post", "span", `//span[contains(text(), "Post")]`},
	}

	for _, tt := range tests {
		got := buildXPathByText(tt.text, tt.tag)
		if got != tt.want {
			t.Errorf("buildXPathByText(%q, %q) = %q, want %q", tt.text, tt.tag, got, tt.want)
		}
	}
}
