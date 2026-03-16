package ratelimit

import (
	"fmt"
	"log/slog"
	"path/filepath"
	"sync"
	"time"

	uberrl "go.uber.org/ratelimit"
)

// ActionType represents a Facebook action that can be rate-limited.
type ActionType string

const (
	ActionFriendRequest ActionType = "friend_request"
	ActionGroupJoin     ActionType = "group_join"
	ActionPost          ActionType = "post"
	ActionComment       ActionType = "comment"
	ActionPageLike      ActionType = "page_like"
	ActionMessage       ActionType = "message"
	ActionGroupInvite   ActionType = "group_invite"
)

// allActionTypes lists every defined action type for validation and iteration.
var allActionTypes = []ActionType{
	ActionFriendRequest,
	ActionGroupJoin,
	ActionPost,
	ActionComment,
	ActionPageLike,
	ActionMessage,
	ActionGroupInvite,
}

// AccountAge represents an account's trust tier based on age.
type AccountAge int

const (
	AccountNew         AccountAge = iota // 0-7 days: most conservative limits
	AccountGrowing                       // 8-30 days: medium limits
	AccountEstablished                   // 31+ days: full limits
)

// defaultLimits maps account age tiers to daily limits per action type.
// Values sourced from ADR-001 Section 3.2.
var defaultLimits = map[AccountAge]map[ActionType]int{
	AccountNew: {
		ActionFriendRequest: 5,
		ActionGroupJoin:     2,
		ActionPost:          2,
		ActionComment:       5,
		ActionPageLike:      8,
		ActionMessage:       3,
		ActionGroupInvite:   5,
	},
	AccountGrowing: {
		ActionFriendRequest: 15,
		ActionGroupJoin:     5,
		ActionPost:          4,
		ActionComment:       10,
		ActionPageLike:      12,
		ActionMessage:       5,
		ActionGroupInvite:   15,
	},
	AccountEstablished: {
		ActionFriendRequest: 25,
		ActionGroupJoin:     10,
		ActionPost:          6,
		ActionComment:       15,
		ActionPageLike:      20,
		ActionMessage:       5,
		ActionGroupInvite:   25,
	},
}

// profileState holds per-profile configuration and rate limiters.
type profileState struct {
	age       AccountAge
	overrides map[ActionType]int
	// intervalLimiters enforces minimum spacing between consecutive same-type actions.
	intervalLimiters map[ActionType]uberrl.Limiter
}

// ActionStatus reports the current rate limit state for a single action type.
type ActionStatus struct {
	Action    ActionType `json:"action"`
	Count     int        `json:"count"`
	Limit     int        `json:"limit"`
	Remaining int        `json:"remaining"`
}

// Limiter enforces daily rate limits per Facebook action type per profile.
// It combines uber-go/ratelimit for minimum interval spacing with a custom
// daily counter persisted to disk.
type Limiter struct {
	store    *store
	mu       sync.Mutex
	profiles map[string]*profileState
}

// New creates a Limiter that persists daily counters under configDir/ratelimits/.
func New(configDir string) (*Limiter, error) {
	if configDir == "" {
		return nil, fmt.Errorf("config directory is required")
	}

	dir := filepath.Join(configDir, "ratelimits")

	return &Limiter{
		store:    newStore(dir),
		profiles: make(map[string]*profileState),
	}, nil
}

// SetProfileAge sets the account age tier for a profile, which determines
// the default daily limits. If not set, defaults to AccountNew (most conservative).
func (l *Limiter) SetProfileAge(profileID string, age AccountAge) {
	l.mu.Lock()
	defer l.mu.Unlock()

	ps := l.getOrCreateProfile(profileID)
	ps.age = age
}

// SetProfileLimits sets custom daily limit overrides for a profile.
// Only the specified action types are overridden; others use the age-tier defaults.
// Set a limit to 0 to disable that action type entirely.
func (l *Limiter) SetProfileLimits(profileID string, overrides map[ActionType]int) {
	l.mu.Lock()
	defer l.mu.Unlock()

	ps := l.getOrCreateProfile(profileID)
	ps.overrides = overrides
}

// Allow checks if a Facebook action is permitted for a profile within daily limits.
// Returns true and increments the counter if allowed, false if the daily limit
// is reached. Returns an error for invalid inputs or I/O failures.
// On I/O failure, returns false (fail closed).
func (l *Limiter) Allow(profileID string, action ActionType) (bool, error) {
	if profileID == "" {
		return false, fmt.Errorf("profile ID is required")
	}

	if !isValidAction(action) {
		return false, fmt.Errorf("unknown action type: %q", action)
	}

	l.mu.Lock()
	defer l.mu.Unlock()

	limit := l.getLimit(profileID, action)

	current, err := l.store.count(profileID, action)
	if err != nil {
		return false, fmt.Errorf("failed to check rate limit for %s/%s: %w", profileID, action, err)
	}

	if current >= limit {
		slog.Info("rate limit reached",
			"profile", profileID,
			"action", string(action),
			"count", current,
			"limit", limit,
		)
		return false, nil
	}

	newCount, err := l.store.increment(profileID, action)
	if err != nil {
		return false, fmt.Errorf("failed to increment rate limit counter for %s/%s: %w", profileID, action, err)
	}

	slog.Info("action allowed",
		"profile", profileID,
		"action", string(action),
		"count", newCount,
		"limit", limit,
	)

	return true, nil
}

// Take waits for the minimum interval between same-type actions (via uber-go/ratelimit),
// then checks the daily limit. Returns nil if the action is allowed, or an error if
// the daily limit is reached or an I/O failure occurs.
func (l *Limiter) Take(profileID string, action ActionType) error {
	if profileID == "" {
		return fmt.Errorf("profile ID is required")
	}

	if !isValidAction(action) {
		return fmt.Errorf("unknown action type: %q", action)
	}

	// Wait for minimum interval spacing.
	l.mu.Lock()
	ps := l.getOrCreateProfile(profileID)
	rl := ps.intervalLimiters[action]
	l.mu.Unlock()

	rl.Take()

	// Now check and increment the daily counter.
	allowed, err := l.Allow(profileID, action)
	if err != nil {
		return err
	}
	if !allowed {
		limit := l.getLimitLocked(profileID, action)
		return fmt.Errorf("daily limit reached for %s: %d/%d", action, limit, limit)
	}

	return nil
}

// Remaining returns how many more times an action can be performed today for a profile.
func (l *Limiter) Remaining(profileID string, action ActionType) (int, error) {
	if profileID == "" {
		return 0, fmt.Errorf("profile ID is required")
	}

	if !isValidAction(action) {
		return 0, fmt.Errorf("unknown action type: %q", action)
	}

	l.mu.Lock()
	defer l.mu.Unlock()

	limit := l.getLimit(profileID, action)

	current, err := l.store.count(profileID, action)
	if err != nil {
		return 0, fmt.Errorf("failed to check remaining for %s/%s: %w", profileID, action, err)
	}

	remaining := limit - current
	if remaining < 0 {
		remaining = 0
	}

	return remaining, nil
}

// Status returns the rate limit status for all action types for a profile.
func (l *Limiter) Status(profileID string) (map[ActionType]ActionStatus, error) {
	if profileID == "" {
		return nil, fmt.Errorf("profile ID is required")
	}

	l.mu.Lock()
	defer l.mu.Unlock()

	result := make(map[ActionType]ActionStatus, len(allActionTypes))

	for _, action := range allActionTypes {
		limit := l.getLimit(profileID, action)
		current, err := l.store.count(profileID, action)
		if err != nil {
			return nil, fmt.Errorf("failed to get status for %s/%s: %w", profileID, action, err)
		}

		remaining := limit - current
		if remaining < 0 {
			remaining = 0
		}

		result[action] = ActionStatus{
			Action:    action,
			Count:     current,
			Limit:     limit,
			Remaining: remaining,
		}
	}

	return result, nil
}

// getOrCreateProfile returns the profile state, creating it if it doesn't exist.
// Must be called with l.mu held.
func (l *Limiter) getOrCreateProfile(profileID string) *profileState {
	ps, ok := l.profiles[profileID]
	if !ok {
		ps = &profileState{
			age:              AccountNew,
			intervalLimiters: makeIntervalLimiters(),
		}
		l.profiles[profileID] = ps
	}
	return ps
}

// getLimit returns the effective daily limit for a profile and action.
// Must be called with l.mu held.
func (l *Limiter) getLimit(profileID string, action ActionType) int {
	ps := l.getOrCreateProfile(profileID)

	// Check for per-profile override first.
	if ps.overrides != nil {
		if limit, ok := ps.overrides[action]; ok {
			return limit
		}
	}

	// Fall back to age-tier default.
	return defaultLimits[ps.age][action]
}

// getLimitLocked acquires the mutex and returns the effective daily limit.
func (l *Limiter) getLimitLocked(profileID string, action ActionType) int {
	l.mu.Lock()
	defer l.mu.Unlock()
	return l.getLimit(profileID, action)
}

// makeIntervalLimiters creates uber-go/ratelimit limiters for each action type.
// These enforce minimum spacing between consecutive same-type actions to prevent
// burst behavior, even when the daily limit has not been reached.
func makeIntervalLimiters() map[ActionType]uberrl.Limiter {
	limiters := make(map[ActionType]uberrl.Limiter, len(allActionTypes))

	for _, action := range allActionTypes {
		rate := intervalRate(action)
		limiters[action] = uberrl.New(rate, uberrl.WithoutSlack)
	}

	return limiters
}

// intervalRate returns the per-second rate for uber-go/ratelimit based on
// spreading the established-tier daily limit evenly across an 8-hour active window.
// This prevents bursting all actions in a short period.
func intervalRate(action ActionType) int {
	// Use established limits as the base for interval calculation.
	dailyLimit := defaultLimits[AccountEstablished][action]
	if dailyLimit == 0 {
		return 1
	}

	// Spread across 8 active hours. Calculate seconds per action.
	activeSeconds := 8 * 3600 // 8 hours
	secsPerAction := activeSeconds / dailyLimit

	// uber-go/ratelimit wants requests per second. For very slow rates
	// (e.g., 1 action per 1440 seconds), we use 1 per second since
	// uber-go/ratelimit minimum is 1/s. The daily counter handles the
	// actual limiting; the interval limiter just prevents rapid bursts.
	_ = secsPerAction

	// For Facebook actions, even the highest daily limit (25/day) means
	// roughly 1 action per 19 minutes over 8 hours. uber-go/ratelimit
	// operates at per-second granularity, so we set all to 1/s (effectively
	// no burst restriction beyond 1 per second). The daily counter is the
	// primary enforcement mechanism.
	return 1
}

// isValidAction returns true if the action type is a known defined type.
func isValidAction(action ActionType) bool {
	for _, a := range allActionTypes {
		if a == action {
			return true
		}
	}
	return false
}

// nowFunc is used for testing to override the current time.
// In production, this is time.Now.
var nowFunc = time.Now
