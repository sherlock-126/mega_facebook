package warmup

import (
	"fmt"
	"log/slog"
	"math/rand"
	"path/filepath"

	"github.com/sherlock-126/mega_facebook/internal/browser"
	"github.com/sherlock-126/mega_facebook/internal/ratelimit"
)

// randIntn wraps rand.Intn for testability.
var randIntn = rand.Intn

// Manager orchestrates warm-up sessions for Facebook profiles.
type Manager struct {
	store   *progressStore
	limiter *ratelimit.Limiter
}

// NewManager creates a Manager that persists progress under configDir/warmup/.
func NewManager(configDir string, limiter *ratelimit.Limiter) (*Manager, error) {
	if configDir == "" {
		return nil, fmt.Errorf("config directory is required")
	}
	if limiter == nil {
		return nil, fmt.Errorf("rate limiter is required")
	}

	dir := filepath.Join(configDir, "warmup")
	return &Manager{
		store:   newProgressStore(dir),
		limiter: limiter,
	}, nil
}

// GetProgress returns the warm-up progress for a profile.
// Returns nil, nil if warm-up has not been started.
func (m *Manager) GetProgress(profileID string) (*Progress, error) {
	if profileID == "" {
		return nil, fmt.Errorf("profile ID is required")
	}
	return m.store.load(profileID)
}

// CurrentPhase returns the current warm-up phase for a profile.
func (m *Manager) CurrentPhase(profileID string) (*Phase, error) {
	p, err := m.GetProgress(profileID)
	if err != nil {
		return nil, err
	}
	if p == nil {
		return nil, fmt.Errorf("warm-up not started for profile %s", profileID)
	}
	return GetPhase(p.CurrentDay()), nil
}

// StartWarmup initializes warm-up tracking for a profile.
// Returns an error if warm-up is already started.
func (m *Manager) StartWarmup(profileID string) error {
	if profileID == "" {
		return fmt.Errorf("profile ID is required")
	}

	existing, err := m.store.load(profileID)
	if err != nil {
		return err
	}
	if existing != nil {
		return fmt.Errorf("warm-up already started for profile %s on %s", profileID, existing.StartDate)
	}

	p := &Progress{
		ProfileID: profileID,
		StartDate: nowFunc().Format("2006-01-02"),
		Sessions:  []SessionLog{},
	}

	if err := m.store.save(p); err != nil {
		return fmt.Errorf("failed to initialize warm-up: %w", err)
	}

	slog.Info("warm-up started", "profile", profileID, "start_date", p.StartDate)
	return nil
}

// PlanSession returns the planned action counts for a session without executing them.
// Useful for dry-run mode.
func (m *Manager) PlanSession(profileID string) (map[ratelimit.ActionType]int, error) {
	phase, err := m.CurrentPhase(profileID)
	if err != nil {
		return nil, err
	}

	plan := make(map[ratelimit.ActionType]int)
	for _, ac := range phase.Actions {
		count := ac.MinPerDay
		if ac.MaxPerDay > ac.MinPerDay {
			count += randIntn(ac.MaxPerDay - ac.MinPerDay + 1)
		}
		plan[ac.Type] = count
	}

	return plan, nil
}

// RunSession executes a warm-up session for a profile using browser automation.
// It determines the current phase, plans actions, executes them, and persists progress.
func (m *Manager) RunSession(profileID string, auto *browser.Automation) (*SessionLog, error) {
	if auto == nil {
		return nil, fmt.Errorf("automation is required")
	}

	progress, err := m.GetProgress(profileID)
	if err != nil {
		return nil, err
	}
	if progress == nil {
		// Auto-start warm-up on first run.
		if startErr := m.StartWarmup(profileID); startErr != nil {
			return nil, startErr
		}
		progress, err = m.GetProgress(profileID)
		if err != nil {
			return nil, err
		}
	}

	phase := GetPhase(progress.CurrentDay())
	slog.Info("running warm-up session",
		"profile", profileID,
		"day", progress.CurrentDay(),
		"phase", phase.Number,
		"phase_name", phase.Name,
	)

	// Set rate limiter profile age based on warm-up phase.
	age := phaseToAccountAge(phase)
	m.limiter.SetProfileAge(profileID, age)

	exec := &executor{
		auto:    auto,
		limiter: m.limiter,
	}

	session := SessionLog{
		Date:    nowFunc().Format("2006-01-02"),
		Phase:   phase.Number,
		Actions: make(map[string]int),
	}

	// Always browse feed first.
	if err := exec.browseFeed(profileID); err != nil {
		slog.Warn("browse feed failed", "error", err)
	}

	// Execute planned actions for this phase.
	for _, ac := range phase.Actions {
		count := ac.MinPerDay
		if ac.MaxPerDay > ac.MinPerDay {
			count += randIntn(ac.MaxPerDay - ac.MinPerDay + 1)
		}

		var done int
		var actionErr error

		switch ac.Type {
		case ratelimit.ActionPageLike:
			done, actionErr = exec.likePosts(profileID, count)
		case ratelimit.ActionFriendRequest:
			done, actionErr = exec.sendFriendRequests(profileID, count)
		case ratelimit.ActionGroupJoin:
			done, actionErr = exec.joinGroups(profileID, count)
		case ratelimit.ActionPost:
			done, actionErr = exec.postContent(profileID)
		default:
			slog.Warn("unsupported warm-up action", "type", ac.Type)
			continue
		}

		if actionErr != nil {
			slog.Warn("action failed", "type", ac.Type, "error", actionErr)
		}

		session.Actions[string(ac.Type)] = done
	}

	// Persist session.
	progress.AddSession(session)
	if err := m.store.save(progress); err != nil {
		return &session, fmt.Errorf("failed to save progress: %w", err)
	}

	slog.Info("warm-up session complete",
		"profile", profileID,
		"phase", phase.Number,
		"actions", session.Actions,
	)

	return &session, nil
}

// Status returns a human-readable status string for a profile's warm-up.
func (m *Manager) Status(profileID string) (string, error) {
	p, err := m.GetProgress(profileID)
	if err != nil {
		return "", err
	}
	if p == nil {
		return fmt.Sprintf("Profile %s: warm-up not started", profileID), nil
	}

	day := p.CurrentDay()
	phase := GetPhase(day)
	return fmt.Sprintf("Profile %s: day %d, phase %d (%s), %d sessions completed",
		profileID, day, phase.Number, phase.Name, len(p.Sessions)), nil
}

// phaseToAccountAge maps warm-up phase to ratelimit account age tier.
func phaseToAccountAge(phase *Phase) ratelimit.AccountAge {
	switch phase.Number {
	case 1, 2:
		return ratelimit.AccountNew
	case 3:
		return ratelimit.AccountGrowing
	default:
		return ratelimit.AccountEstablished
	}
}
