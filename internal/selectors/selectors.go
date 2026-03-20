// Package selectors provides a centralized registry of Facebook DOM selectors.
//
// All selectors use semantic attributes (aria-label, role, data-*, name, type)
// instead of CSS class names or IDs. Facebook uses React with auto-generated
// hashed class names that change frequently, so semantic selectors are more stable.
//
// When Facebook changes its DOM, update selectors here — all consumer packages
// (browser, auth) import from this single source of truth.
package selectors

import "fmt"

// LoggedIn selectors indicate the user is logged into Facebook.
var LoggedIn = []string{
	"[role='navigation']",
	"[aria-label='Facebook']",
	"div[data-pagelet='Stories']",
}

// LoggedOut selectors indicate the user is on the login page (not logged in).
var LoggedOut = []string{
	"input[name='email']",
	"input[name='pass']",
	"button[name='login']",
}

// TwoFA selectors identify 2FA code input fields on checkpoint pages.
var TwoFA = []string{
	"input[name='approvals_code']",
}

// Submit selectors identify form submission buttons (login, 2FA continue, etc.).
var Submit = []string{
	"button[type='submit']",
	"button[name='submit[Continue]']",
}

// XPathByText builds an XPath expression to find elements by visible text content.
// If tag is empty, it searches all elements ("*").
// This is resilient to Facebook's hashed CSS classes since it matches on text.
func XPathByText(text, tag string) string {
	if tag == "" {
		tag = "*"
	}
	return fmt.Sprintf("//%s[contains(text(), %q)]", tag, text)
}
