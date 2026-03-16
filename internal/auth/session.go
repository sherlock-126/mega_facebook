package auth

import (
	"fmt"
	"strings"
	"time"

	"github.com/go-rod/rod"
	"github.com/go-rod/rod/lib/proto"
)

// SessionState represents the authentication state of a Facebook session.
type SessionState string

const (
	StateLoggedIn    SessionState = "logged_in"
	StateLoggedOut   SessionState = "logged_out"
	StateCheckpoint  SessionState = "checkpoint"
	State2FARequired SessionState = "2fa_required"

	sessionCheckTimeout = 10 * time.Second
)

// facebookURL is the target URL for session checks.
const facebookURL = "https://www.facebook.com"

// loggedInSelectors indicate the user is logged in.
var loggedInSelectors = []string{
	"[role='navigation']",
	"[aria-label='Facebook']",
	"div[data-pagelet='Stories']",
}

// loggedOutSelectors indicate the user needs to log in.
var loggedOutSelectors = []string{
	"input[name='email']",
	"input[name='pass']",
	"button[name='login']",
}

// twoFASelectors indicate a 2FA prompt.
var twoFASelectors = []string{
	"input[name='approvals_code']",
	"#approvals_code",
}

// ClassifyURL classifies session state based on URL patterns alone.
// Returns empty string if URL is not conclusive.
func ClassifyURL(url string) SessionState {
	lower := strings.ToLower(url)

	if strings.Contains(lower, "/checkpoint") {
		return StateCheckpoint
	}
	if strings.Contains(lower, "/login") || strings.Contains(lower, "/recover") {
		return StateLoggedOut
	}

	return ""
}

// CheckSessionState opens a page in the browser, navigates to Facebook,
// and determines the current session state.
func CheckSessionState(browser *rod.Browser) (SessionState, error) {
	page, err := browser.Page(proto.TargetCreateTarget{URL: ""})
	if err != nil {
		pages, pErr := browser.Pages()
		if pErr != nil {
			return "", fmt.Errorf("failed to get browser pages: %w", pErr)
		}
		page = pages.First()
		if page == nil {
			return "", fmt.Errorf("no pages available in browser")
		}
	}
	defer page.Close()

	if err := page.Timeout(30 * time.Second).Navigate(facebookURL); err != nil {
		return "", fmt.Errorf("failed to navigate to Facebook: %w", err)
	}

	if err := page.Timeout(30 * time.Second).WaitLoad(); err != nil {
		return "", fmt.Errorf("Facebook page load timed out: %w", err)
	}

	// Wait for redirects to settle
	time.Sleep(2 * time.Second)

	// Check URL-based classification first
	info, err := page.Info()
	if err == nil && info.URL != "" {
		if state := ClassifyURL(info.URL); state != "" {
			// If checkpoint, check if it's specifically a 2FA prompt
			if state == StateCheckpoint {
				for _, sel := range twoFASelectors {
					has, _, err := page.Has(sel)
					if err == nil && has {
						return State2FARequired, nil
					}
				}
			}
			return state, nil
		}
	}

	// Check for login form (logged out)
	for _, sel := range loggedOutSelectors {
		has, _, err := page.Has(sel)
		if err == nil && has {
			return StateLoggedOut, nil
		}
	}

	// Check for logged-in indicators
	for _, sel := range loggedInSelectors {
		has, _, err := page.Has(sel)
		if err == nil && has {
			return StateLoggedIn, nil
		}
	}

	return StateLoggedOut, nil
}
