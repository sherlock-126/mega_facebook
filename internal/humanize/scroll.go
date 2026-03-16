package humanize

import (
	"math/rand"
	"time"
)

const (
	// scrollStepDelayMin is the minimum delay between scroll steps in ms.
	scrollStepDelayMin = 30
	// scrollStepDelayMax is the maximum delay between scroll steps in ms.
	scrollStepDelayMax = 120

	// readingPauseMin is the minimum reading pause duration in ms.
	readingPauseMin = 500
	// readingPauseMax is the maximum reading pause duration in ms.
	readingPauseMax = 2000
)

// ScrollConfig configures how a scroll operation should behave.
type ScrollConfig struct {
	// Direction is "down" or "up".
	Direction string
	// Distance is the total scroll distance in pixels.
	Distance int
	// Steps is the number of scroll increments.
	Steps int
	// ReadingPause enables random reading pauses during scrolling.
	ReadingPause bool
}

// ScrollStep represents a single scroll increment in a scroll plan.
type ScrollStep struct {
	// DeltaY is the scroll amount in pixels (positive = down, negative = up).
	DeltaY int
	// Delay is the time to wait after this scroll step.
	Delay time.Duration
	// Pause is an additional reading pause after this step (0 if no pause).
	Pause time.Duration
}

// ScrollPlan generates a sequence of scroll steps with variable speeds
// and optional reading pauses to simulate human scrolling behavior.
// Returns nil for zero distance.
func ScrollPlan(cfg ScrollConfig) []ScrollStep {
	if cfg.Distance <= 0 {
		return nil
	}
	if cfg.Steps < 1 {
		cfg.Steps = 1
	}

	// Generate variable step sizes that sum to the total distance.
	deltas := variablePartition(cfg.Distance, cfg.Steps)

	steps := make([]ScrollStep, len(deltas))
	for i, delta := range deltas {
		dy := delta
		if cfg.Direction == "up" {
			dy = -dy
		}

		steps[i] = ScrollStep{
			DeltaY: dy,
			Delay:  RandomDelay(scrollStepDelayMin, scrollStepDelayMax),
		}
	}

	// Insert reading pauses at random positions if enabled.
	if cfg.ReadingPause && len(steps) > 2 {
		// Add 1-3 reading pauses at random positions (not first or last step).
		numPauses := 1 + rand.Intn(3)
		if numPauses > len(steps)-2 {
			numPauses = len(steps) - 2
		}
		// Pick random positions for pauses (avoiding first and last).
		positions := rand.Perm(len(steps) - 2)
		for i := 0; i < numPauses && i < len(positions); i++ {
			idx := positions[i] + 1 // offset by 1 to skip first step
			steps[idx].Pause = RandomDelay(readingPauseMin, readingPauseMax)
		}
	}

	return steps
}

// variablePartition splits total into n parts with random variation.
// Each part is at least 1. The sum of all parts equals total.
func variablePartition(total, n int) []int {
	if n <= 0 {
		return nil
	}
	if n == 1 {
		return []int{total}
	}
	if total < n {
		// Not enough pixels for all steps; distribute 1 pixel each.
		parts := make([]int, total)
		for i := range parts {
			parts[i] = 1
		}
		return parts
	}

	// Generate random weights and scale to sum to total.
	parts := make([]int, n)
	remaining := total

	for i := 0; i < n-1; i++ {
		// Average share for remaining steps.
		avg := float64(remaining) / float64(n-i)
		// Vary between 50% and 150% of average.
		part := int(avg * (0.5 + rand.Float64()))
		if part < 1 {
			part = 1
		}
		if part >= remaining-(n-i-1) {
			part = remaining - (n - i - 1)
		}
		parts[i] = part
		remaining -= part
	}
	parts[n-1] = remaining

	return parts
}
