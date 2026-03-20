package humanize

import (
	"fmt"
	"log/slog"
	"time"

	"github.com/go-rod/rod"
	"github.com/go-rod/rod/lib/input"
	"github.com/go-rod/rod/lib/proto"
)

const (
	// mouseStepDelay is the delay between mouse movement steps in ms.
	mouseStepDelayMin = 2
	mouseStepDelayMax = 8

	// defaultMouseSteps is the default number of points in a mouse movement.
	defaultMouseSteps = 25

	// defaultScrollSteps is the default number of steps for a scroll operation.
	defaultScrollSteps = 8

	// defaultElementTimeout is the timeout for finding elements.
	defaultHumanizerTimeout = 10 * time.Second
)

// Humanizer provides human-like browser interaction methods.
// It wraps a go-rod Page and uses the humanize primitives (Bezier curves,
// variable delays, typing with typos) to simulate realistic user behavior.
type Humanizer struct {
	page *rod.Page
}

// New creates a Humanizer wrapping the given go-rod page.
// The page should be a stealth page created via browser.StealthPage().
func New(page *rod.Page) (*Humanizer, error) {
	if page == nil {
		return nil, fmt.Errorf("cannot create humanizer: page is nil")
	}
	return &Humanizer{page: page}, nil
}

// Page returns the underlying rod.Page.
func (h *Humanizer) Page() *rod.Page {
	return h.page
}

// MoveTo moves the mouse from its current position to the target (x, y)
// using a Bezier curve path with natural-looking movement.
// Coordinates are clamped to non-negative values.
func (h *Humanizer) MoveTo(x, y float64) error {
	if x < 0 {
		x = 0
	}
	if y < 0 {
		y = 0
	}

	slog.Info("moving mouse", "target_x", x, "target_y", y)

	// Get current mouse position from go-rod's tracked position.
	currentPos := h.page.Mouse.Position()
	start := Point{X: float64(currentPos.X), Y: float64(currentPos.Y)}
	end := Point{X: x, Y: y}

	// Use overshoot for more natural movement.
	points := WithOvershoot(start, end, defaultMouseSteps)

	for _, p := range points {
		err := h.page.Mouse.MoveTo(proto.Point{X: p.X, Y: p.Y})
		if err != nil {
			return fmt.Errorf("failed to move mouse to (%.0f, %.0f): %w", p.X, p.Y, err)
		}
		time.Sleep(RandomDelay(mouseStepDelayMin, mouseStepDelayMax))
	}

	slog.Info("mouse moved", "target_x", x, "target_y", y)
	return nil
}

// ScrollDown scrolls the page down by the given number of pixels
// using variable-speed scrolling with reading pauses.
// Returns nil for 0 pixels.
func (h *Humanizer) ScrollDown(pixels int) error {
	if pixels <= 0 {
		return nil
	}
	return h.scroll("down", pixels)
}

// ScrollUp scrolls the page up by the given number of pixels
// using variable-speed scrolling with reading pauses.
// Returns nil for 0 pixels.
func (h *Humanizer) ScrollUp(pixels int) error {
	if pixels <= 0 {
		return nil
	}
	return h.scroll("up", pixels)
}

func (h *Humanizer) scroll(direction string, pixels int) error {
	slog.Info("scrolling", "direction", direction, "pixels", pixels)

	plan := ScrollPlan(ScrollConfig{
		Direction:    direction,
		Distance:     pixels,
		Steps:        defaultScrollSteps,
		ReadingPause: true,
	})

	for _, step := range plan {
		err := h.page.Mouse.Scroll(0, float64(step.DeltaY), 0)
		if err != nil {
			return fmt.Errorf("failed to scroll %s %dpx: %w", direction, pixels, err)
		}
		time.Sleep(step.Delay)
		if step.Pause > 0 {
			slog.Info("reading pause", "duration_ms", step.Pause.Milliseconds())
			time.Sleep(step.Pause)
		}
	}

	slog.Info("scroll complete", "direction", direction, "pixels", pixels)
	return nil
}

// TypeText finds an element by selector, focuses it, and types the given text
// with human-like per-character delays and occasional typos with corrections.
func (h *Humanizer) TypeText(selector, text string) error {
	if selector == "" {
		return fmt.Errorf("cannot type: empty selector")
	}
	if text == "" {
		return fmt.Errorf("cannot type: empty text")
	}

	slog.Info("typing (humanized)", "selector", selector, "length", len(text))

	el, err := h.page.Timeout(defaultHumanizerTimeout).Element(selector)
	if err != nil {
		return fmt.Errorf("failed to type into %q: element not found: %w", selector, err)
	}

	if err := el.ScrollIntoView(); err != nil {
		return fmt.Errorf("failed to scroll element into view %q: %w", selector, err)
	}

	// Click to focus.
	if err := el.Click(proto.InputMouseButtonLeft, 1); err != nil {
		return fmt.Errorf("failed to focus element %q for typing: %w", selector, err)
	}
	time.Sleep(RandomDelay(100, 300))

	// Generate and execute typing plan.
	plan := PlanTyping(text)

	for _, action := range plan.Actions {
		time.Sleep(action.Delay)

		if err := typeRune(el, action.Char); err != nil {
			return fmt.Errorf("failed to type into %q: %w", selector, err)
		}

		// If typo, execute correction sequence.
		if action.IsTypo {
			for _, correction := range action.Correction {
				time.Sleep(correction.Delay)
				if err := typeRune(el, correction.Char); err != nil {
					return fmt.Errorf("failed to type correction into %q: %w", selector, err)
				}
			}
		}
	}

	slog.Info("typing complete", "selector", selector, "length", len(text))
	return nil
}

// typeRune types a single rune into an element. Handles backspace specially.
func typeRune(el *rod.Element, ch rune) error {
	if ch == backspaceRune {
		return el.Type(input.Backspace)
	}
	return el.Type(input.Key(ch))
}
