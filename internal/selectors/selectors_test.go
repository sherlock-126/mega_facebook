package selectors

import (
	"strings"
	"testing"
)

// allGroups returns all selector groups for bulk validation.
func allGroups() map[string][]string {
	return map[string][]string{
		"LoggedIn":  LoggedIn,
		"LoggedOut": LoggedOut,
		"TwoFA":     TwoFA,
		"Submit":    Submit,
	}
}

func TestSelectorGroups_NotEmpty(t *testing.T) {
	for name, group := range allGroups() {
		if len(group) == 0 {
			t.Errorf("selector group %s is empty", name)
		}
	}
}

func TestSelectorGroups_NoIDSelectors(t *testing.T) {
	for name, group := range allGroups() {
		for _, sel := range group {
			if strings.HasPrefix(sel, "#") {
				t.Errorf("selector group %s contains fragile ID selector: %s", name, sel)
			}
		}
	}
}

func TestSelectorGroups_NoCSSClassSelectors(t *testing.T) {
	for name, group := range allGroups() {
		for _, sel := range group {
			if strings.HasPrefix(sel, ".") {
				t.Errorf("selector group %s contains CSS class selector: %s", name, sel)
			}
		}
	}
}

func TestSelectorGroups_AllSemantic(t *testing.T) {
	// Semantic selectors use attributes like aria-label, role, data-*, name, type
	semanticPatterns := []string{"[", "//"}
	for name, group := range allGroups() {
		for _, sel := range group {
			hasSemantic := false
			for _, pat := range semanticPatterns {
				if strings.Contains(sel, pat) {
					hasSemantic = true
					break
				}
			}
			// Also allow tag[attr] patterns like "div[data-pagelet='Stories']"
			if !hasSemantic {
				t.Errorf("selector group %s has non-semantic selector: %s", name, sel)
			}
		}
	}
}

func TestXPathByText_ValidInputs(t *testing.T) {
	tests := []struct {
		text string
		tag  string
		want string
	}{
		{"Login", "button", `//button[contains(text(), "Login")]`},
		{"Sign Up", "a", `//a[contains(text(), "Sign Up")]`},
		{"Post", "span", `//span[contains(text(), "Post")]`},
	}

	for _, tt := range tests {
		got := XPathByText(tt.text, tt.tag)
		if got != tt.want {
			t.Errorf("XPathByText(%q, %q) = %q, want %q", tt.text, tt.tag, got, tt.want)
		}
	}
}

func TestXPathByText_EmptyTag(t *testing.T) {
	got := XPathByText("Hello", "")
	want := `//*[contains(text(), "Hello")]`
	if got != want {
		t.Errorf("XPathByText(%q, %q) = %q, want %q", "Hello", "", got, want)
	}
}

func TestXPathByText_SpecialChars(t *testing.T) {
	got := XPathByText(`Say "hello"`, "div")
	// fmt %q will escape the inner quotes
	if !strings.Contains(got, "//div[contains(text(),") {
		t.Errorf("XPathByText with quotes produced unexpected output: %s", got)
	}
}
