package humanize

import (
	"math/rand"
	"time"
)

const (
	// ClickDelayMin is the minimum delay after clicks in milliseconds.
	ClickDelayMin = 800
	// ClickDelayMax is the maximum delay after clicks in milliseconds.
	ClickDelayMax = 2500

	// PageLoadDelayMin is the minimum delay after page loads in milliseconds.
	PageLoadDelayMin = 1500
	// PageLoadDelayMax is the maximum delay after page loads in milliseconds.
	PageLoadDelayMax = 4000

	// TypeDelayMin is the minimum delay between keystrokes in milliseconds.
	TypeDelayMin = 50
	// TypeDelayMax is the maximum delay between keystrokes in milliseconds.
	TypeDelayMax = 150
)

// ClickDelay returns a randomized duration between 800-2500ms for use after clicks.
func ClickDelay() time.Duration {
	return RandomDelay(ClickDelayMin, ClickDelayMax)
}

// PageLoadDelay returns a randomized duration between 1500-4000ms for use after page loads.
func PageLoadDelay() time.Duration {
	return RandomDelay(PageLoadDelayMin, PageLoadDelayMax)
}

// TypeDelay returns a randomized duration between 50-150ms for use between keystrokes.
func TypeDelay() time.Duration {
	return RandomDelay(TypeDelayMin, TypeDelayMax)
}

// RandomDelay returns a randomized duration between min and max milliseconds (inclusive).
// If min > max, they are swapped. If min == max, returns that exact duration.
func RandomDelay(minMs, maxMs int) time.Duration {
	if minMs > maxMs {
		minMs, maxMs = maxMs, minMs
	}
	if minMs == maxMs {
		return time.Duration(minMs) * time.Millisecond
	}
	ms := minMs + rand.Intn(maxMs-minMs+1)
	return time.Duration(ms) * time.Millisecond
}
