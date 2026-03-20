// Package warmup implements a graduated account warm-up workflow for Facebook
// profiles. It manages 4 phases of increasing activity over 2-4 weeks to
// establish account trust and avoid detection.
package warmup

import (
	"github.com/sherlock-126/mega_facebook/internal/ratelimit"
)

// ActionConfig defines an action type and its daily target range for a phase.
type ActionConfig struct {
	Type      ratelimit.ActionType
	MinPerDay int
	MaxPerDay int
}

// Phase represents a warm-up phase with its configuration.
type Phase struct {
	Number   int
	Name     string         // "passive", "social", "active", "established"
	DayStart int            // Inclusive start day (1-indexed)
	DayEnd   int            // Inclusive end day (0 = no upper bound)
	Actions  []ActionConfig // Actions to perform in this phase
}

// Phases defines the 4 graduated warm-up phases per ADR-001 Section 3.4.
var Phases = []Phase{
	{
		Number:   1,
		Name:     "passive",
		DayStart: 1,
		DayEnd:   3,
		Actions: []ActionConfig{
			{Type: ratelimit.ActionPageLike, MinPerDay: 2, MaxPerDay: 3},
		},
	},
	{
		Number:   2,
		Name:     "social",
		DayStart: 4,
		DayEnd:   7,
		Actions: []ActionConfig{
			{Type: ratelimit.ActionPageLike, MinPerDay: 3, MaxPerDay: 5},
			{Type: ratelimit.ActionFriendRequest, MinPerDay: 2, MaxPerDay: 3},
			{Type: ratelimit.ActionGroupJoin, MinPerDay: 1, MaxPerDay: 2},
		},
	},
	{
		Number:   3,
		Name:     "active",
		DayStart: 8,
		DayEnd:   14,
		Actions: []ActionConfig{
			{Type: ratelimit.ActionPageLike, MinPerDay: 5, MaxPerDay: 8},
			{Type: ratelimit.ActionFriendRequest, MinPerDay: 5, MaxPerDay: 10},
			{Type: ratelimit.ActionGroupJoin, MinPerDay: 2, MaxPerDay: 3},
			{Type: ratelimit.ActionPost, MinPerDay: 1, MaxPerDay: 2},
		},
	},
	{
		Number:   4,
		Name:     "established",
		DayStart: 15,
		DayEnd:   0, // No upper bound
		Actions: []ActionConfig{
			{Type: ratelimit.ActionPageLike, MinPerDay: 8, MaxPerDay: 15},
			{Type: ratelimit.ActionFriendRequest, MinPerDay: 10, MaxPerDay: 20},
			{Type: ratelimit.ActionGroupJoin, MinPerDay: 3, MaxPerDay: 5},
			{Type: ratelimit.ActionPost, MinPerDay: 2, MaxPerDay: 4},
			{Type: ratelimit.ActionComment, MinPerDay: 3, MaxPerDay: 8},
		},
	},
}

// GetPhase returns the warm-up phase for the given day number (1-indexed).
// Days <= 0 are clamped to day 1. Days beyond the last phase stay in the
// final phase (established).
func GetPhase(day int) *Phase {
	if day <= 0 {
		day = 1
	}

	for i := range Phases {
		p := &Phases[i]
		if day >= p.DayStart && (p.DayEnd == 0 || day <= p.DayEnd) {
			return p
		}
	}

	// Shouldn't reach here given phase 4 has no upper bound,
	// but return last phase as safety.
	return &Phases[len(Phases)-1]
}
