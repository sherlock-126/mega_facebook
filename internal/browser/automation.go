package browser

import (
	"fmt"
	"log/slog"
	"math/rand"
	"os"
	"path/filepath"
	"time"

	"github.com/go-rod/rod"
	"github.com/go-rod/rod/lib/input"
	"github.com/go-rod/rod/lib/proto"
	"github.com/sherlock-126/mega_facebook/internal/selectors"
)

const (
	// Delay ranges for human-like behavior (per project rules).
	clickDelayMin    = 800  // ms
	clickDelayMax    = 2500 // ms
	pageLoadDelayMin = 1500 // ms
	pageLoadDelayMax = 4000 // ms
	typeDelayMin     = 50   // ms per character
	typeDelayMax     = 150  // ms per character

	// defaultElementTimeout is the default timeout for waiting on elements.
	defaultElementTimeout = 10 * time.Second
)

// Automation provides human-like browser automation primitives on a stealth page.
type Automation struct {
	page           *rod.Page
	elementTimeout time.Duration
}

// NewAutomation creates an Automation instance wrapping a stealth page.
// The page should be created via StealthPage() before passing here.
func NewAutomation(page *rod.Page) (*Automation, error) {
	if page == nil {
		return nil, fmt.Errorf("cannot create automation: page is nil")
	}
	return &Automation{
		page:           page,
		elementTimeout: defaultElementTimeout,
	}, nil
}

// Page returns the underlying rod.Page for advanced use cases.
func (a *Automation) Page() *rod.Page {
	return a.page
}

// Navigate navigates to the given URL and waits for the page to load.
// Applies a randomized human-like delay after page load (1500-4000ms).
func (a *Automation) Navigate(url string) error {
	if url == "" {
		return fmt.Errorf("cannot navigate: empty URL")
	}

	slog.Info("navigating", "url", url)

	if err := a.page.Timeout(navigationTimeout).Navigate(url); err != nil {
		return fmt.Errorf("failed to navigate to %s: %w", url, err)
	}

	if err := a.page.Timeout(navigationTimeout).WaitLoad(); err != nil {
		return fmt.Errorf("page load timed out for %s: %w", url, err)
	}

	delay := pageLoadDelay()
	slog.Info("page loaded, waiting", "url", url, "delay_ms", delay.Milliseconds())
	time.Sleep(delay)

	return nil
}

// Click finds an element by the given CSS selector, scrolls it into view, and clicks it.
// Uses semantic selectors (aria-label, role, data-testid) per project conventions.
// Applies a randomized human-like delay after clicking (800-2500ms).
func (a *Automation) Click(selector string) error {
	if selector == "" {
		return fmt.Errorf("cannot click: empty selector")
	}

	slog.Info("clicking", "selector", selector)

	el, err := a.page.Timeout(a.elementTimeout).Element(selector)
	if err != nil {
		return fmt.Errorf("failed to click element %q: %w", selector, err)
	}

	if err := el.ScrollIntoView(); err != nil {
		return fmt.Errorf("failed to scroll element into view %q: %w", selector, err)
	}

	if err := el.Click(proto.InputMouseButtonLeft, 1); err != nil {
		return fmt.Errorf("failed to click element %q: %w", selector, err)
	}

	delay := clickDelay()
	slog.Info("clicked", "selector", selector, "delay_ms", delay.Milliseconds())
	time.Sleep(delay)

	return nil
}

// Type finds an element by selector, focuses it, and types the given text
// with randomized per-character delays (50-150ms) to simulate human typing.
func (a *Automation) Type(selector, text string) error {
	if selector == "" {
		return fmt.Errorf("cannot type: empty selector")
	}
	if text == "" {
		return fmt.Errorf("cannot type: empty text")
	}

	slog.Info("typing", "selector", selector, "length", len(text))

	el, err := a.page.Timeout(a.elementTimeout).Element(selector)
	if err != nil {
		return fmt.Errorf("failed to type into %q: element not found: %w", selector, err)
	}

	if err := el.ScrollIntoView(); err != nil {
		return fmt.Errorf("failed to scroll element into view %q: %w", selector, err)
	}

	// Click to focus the element
	if err := el.Click(proto.InputMouseButtonLeft, 1); err != nil {
		return fmt.Errorf("failed to focus element %q for typing: %w", selector, err)
	}

	// Type each character with a randomized delay
	for _, ch := range text {
		if err := el.Type(input.Key(ch)); err != nil {
			return fmt.Errorf("failed to type into %q: %w", selector, err)
		}
		time.Sleep(typeDelay())
	}

	slog.Info("typed", "selector", selector, "length", len(text))
	return nil
}

// Screenshot captures a full-page screenshot and saves it as a PNG file.
// Creates parent directories if they don't exist.
func (a *Automation) Screenshot(path string) error {
	if path == "" {
		return fmt.Errorf("cannot take screenshot: empty path")
	}

	slog.Info("taking screenshot", "path", path)

	// Ensure parent directory exists
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return fmt.Errorf("failed to create screenshot directory %q: %w", dir, err)
	}

	data, err := a.page.Screenshot(true, nil)
	if err != nil {
		return fmt.Errorf("failed to capture screenshot: %w", err)
	}

	if err := os.WriteFile(path, data, 0o644); err != nil {
		return fmt.Errorf("failed to save screenshot to %q: %w", path, err)
	}

	slog.Info("screenshot saved", "path", path, "bytes", len(data))
	return nil
}

// WaitForElement waits for an element matching the selector to appear in the DOM.
// If timeout is 0, the default element timeout is used.
func (a *Automation) WaitForElement(selector string, timeout time.Duration) (*rod.Element, error) {
	if selector == "" {
		return nil, fmt.Errorf("cannot wait for element: empty selector")
	}

	if timeout == 0 {
		timeout = a.elementTimeout
	}

	slog.Info("waiting for element", "selector", selector, "timeout", timeout)

	el, err := a.page.Timeout(timeout).Element(selector)
	if err != nil {
		return nil, fmt.Errorf("element not found within %s: %q: %w", timeout, selector, err)
	}

	slog.Info("element found", "selector", selector)
	return el, nil
}

// FindByText finds an element containing the given visible text.
// The tag parameter limits the search to a specific HTML tag (e.g., "button", "a", "span").
// If tag is empty, it searches all elements ("*").
// Uses XPath for text matching, which is resilient to Facebook's hashed CSS classes.
func (a *Automation) FindByText(text, tag string) (*rod.Element, error) {
	if text == "" {
		return nil, fmt.Errorf("cannot find by text: empty text")
	}

	xpath := selectors.XPathByText(text, tag)
	slog.Info("finding by text", "text", text, "tag", tag, "xpath", xpath)

	el, err := a.page.Timeout(a.elementTimeout).ElementX(xpath)
	if err != nil {
		return nil, fmt.Errorf("failed to find element with text %q (tag=%q): %w", text, tag, err)
	}

	slog.Info("found element by text", "text", text, "tag", tag)
	return el, nil
}

// clickDelay returns a randomized duration between 800-2500ms for use after clicks.
func clickDelay() time.Duration {
	ms := clickDelayMin + rand.Intn(clickDelayMax-clickDelayMin+1)
	return time.Duration(ms) * time.Millisecond
}

// pageLoadDelay returns a randomized duration between 1500-4000ms for use after page loads.
func pageLoadDelay() time.Duration {
	ms := pageLoadDelayMin + rand.Intn(pageLoadDelayMax-pageLoadDelayMin+1)
	return time.Duration(ms) * time.Millisecond
}

// typeDelay returns a randomized duration between 50-150ms for use between keystrokes.
func typeDelay() time.Duration {
	ms := typeDelayMin + rand.Intn(typeDelayMax-typeDelayMin+1)
	return time.Duration(ms) * time.Millisecond
}
