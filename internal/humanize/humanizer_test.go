package humanize

import (
	"testing"

	"github.com/go-rod/rod"
)

func TestNew_NilPage(t *testing.T) {
	_, err := New(nil)
	if err == nil {
		t.Fatal("expected error for nil page")
	}
	if got := err.Error(); got != "cannot create humanizer: page is nil" {
		t.Fatalf("unexpected error: %s", got)
	}
}

func TestNew_ValidPage(t *testing.T) {
	page := &rod.Page{}
	h, err := New(page)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if h == nil {
		t.Fatal("expected non-nil Humanizer")
	}
	if h.Page() != page {
		t.Fatal("expected Page() to return the same page")
	}
}

func TestScrollDown_ZeroPixels(t *testing.T) {
	page := &rod.Page{}
	h, _ := New(page)
	err := h.ScrollDown(0)
	if err != nil {
		t.Fatalf("expected nil for 0 pixels, got: %v", err)
	}
}

func TestScrollUp_ZeroPixels(t *testing.T) {
	page := &rod.Page{}
	h, _ := New(page)
	err := h.ScrollUp(0)
	if err != nil {
		t.Fatalf("expected nil for 0 pixels, got: %v", err)
	}
}

func TestTypeText_EmptySelector(t *testing.T) {
	page := &rod.Page{}
	h, _ := New(page)
	err := h.TypeText("", "text")
	if err == nil {
		t.Fatal("expected error for empty selector")
	}
	if got := err.Error(); got != "cannot type: empty selector" {
		t.Fatalf("unexpected error: %s", got)
	}
}

func TestTypeText_EmptyText(t *testing.T) {
	page := &rod.Page{}
	h, _ := New(page)
	err := h.TypeText("[name='email']", "")
	if err == nil {
		t.Fatal("expected error for empty text")
	}
	if got := err.Error(); got != "cannot type: empty text" {
		t.Fatalf("unexpected error: %s", got)
	}
}

func TestScrollDown_NegativePixels(t *testing.T) {
	page := &rod.Page{}
	h, _ := New(page)
	err := h.ScrollDown(-100)
	if err != nil {
		t.Fatalf("expected nil for negative pixels, got: %v", err)
	}
}
