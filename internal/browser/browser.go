package browser

import (
	"fmt"
	"strings"
	"time"

	"github.com/go-rod/rod"
	"github.com/go-rod/rod/lib/launcher"
	"github.com/go-rod/rod/lib/proto"
)

const (
	facebookURL      = "https://www.facebook.com"
	navigationTimeout = 30 * time.Second
	elementTimeout    = 10 * time.Second
)

// loginSelectors are CSS selectors that indicate the user is logged in.
var loginSelectors = []string{
	"[role='navigation']",
	"[aria-label='Facebook']",
	"div[data-pagelet='Stories']",
}

// logoutSelectors are CSS selectors that indicate the user is NOT logged in.
var logoutSelectors = []string{
	"input[name='email']",
	"input[name='pass']",
	"button[name='login']",
}

// ConnectResult holds the browser and page after connecting.
type ConnectResult struct {
	Browser *rod.Browser
	Page    *rod.Page
}

// Connect connects go-rod to an existing browser via a puppeteer WebSocket URL.
func Connect(wsURL string) (*ConnectResult, error) {
	if wsURL == "" {
		return nil, fmt.Errorf("empty WebSocket URL: cannot connect to browser")
	}

	u, err := launcher.ResolveURL(wsURL)
	if err != nil {
		return nil, fmt.Errorf("failed to resolve WebSocket URL %q: %w", wsURL, err)
	}

	browser := rod.New().ControlURL(u)
	if err := browser.Connect(); err != nil {
		return nil, fmt.Errorf("failed to connect to browser via WebSocket: %w", err)
	}

	return &ConnectResult{Browser: browser}, nil
}

// CheckFacebookLogin navigates to facebook.com and checks if the user is logged in.
// Returns (true, nil) if logged in, (false, nil) if not, or (false, error) on failure.
func CheckFacebookLogin(browser *rod.Browser) (bool, error) {
	page, err := browser.Page(proto.TargetCreateTarget{URL: ""})
	if err != nil {
		pages, pErr := browser.Pages()
		if pErr != nil {
			return false, fmt.Errorf("failed to get browser pages: %w", pErr)
		}
		page = pages.First()
		if page == nil {
			return false, fmt.Errorf("no pages available in browser")
		}
	}

	if err := page.Timeout(navigationTimeout).Navigate(facebookURL); err != nil {
		return false, fmt.Errorf("failed to navigate to Facebook: %w", err)
	}

	if err := page.Timeout(navigationTimeout).WaitLoad(); err != nil {
		return false, fmt.Errorf("Facebook page load timed out: %w", err)
	}

	// Wait a moment for any redirects to settle
	time.Sleep(2 * time.Second)

	// Check for login form elements first (faster signal for logged-out state)
	for _, sel := range logoutSelectors {
		has, _, err := page.Has(sel)
		if err == nil && has {
			return false, nil
		}
	}

	// Check for logged-in indicators
	for _, sel := range loginSelectors {
		has, _, err := page.Has(sel)
		if err == nil && has {
			return true, nil
		}
	}

	// If we can't determine state, check the URL
	info, err := page.Info()
	if err == nil && info.URL != "" {
		// If redirected to login page
		if containsLoginPath(info.URL) {
			return false, nil
		}
	}

	// Default to not logged in if we can't determine
	return false, nil
}

func containsLoginPath(url string) bool {
	loginPaths := []string{"/login", "/checkpoint", "/recover"}
	for _, path := range loginPaths {
		if strings.Contains(url, path) {
			return true
		}
	}
	return false
}
