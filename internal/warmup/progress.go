package warmup

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"time"
)

// Progress tracks warm-up state for a single profile.
type Progress struct {
	ProfileID string       `json:"profile_id"`
	StartDate string       `json:"start_date"` // YYYY-MM-DD
	Sessions  []SessionLog `json:"sessions"`
}

// SessionLog records what happened in one warm-up session.
type SessionLog struct {
	Date    string         `json:"date"`
	Phase   int            `json:"phase"`
	Actions map[string]int `json:"actions"` // action_type -> count
}

// nowFunc is overridable for testing.
var nowFunc = time.Now

// CurrentDay computes the current warm-up day (1-indexed) from the start date.
// Returns 1 if the start date is today or in the future.
func (p *Progress) CurrentDay() int {
	start, err := time.Parse("2006-01-02", p.StartDate)
	if err != nil {
		return 1
	}

	today := nowFunc().Truncate(24 * time.Hour)
	start = start.Truncate(24 * time.Hour)

	days := int(today.Sub(start).Hours()/24) + 1
	if days < 1 {
		return 1
	}
	return days
}

// AddSession appends a session log to the progress.
func (p *Progress) AddSession(log SessionLog) {
	p.Sessions = append(p.Sessions, log)
}

// progressStore handles file-based persistence of warm-up progress.
type progressStore struct {
	dir string
}

func newProgressStore(dir string) *progressStore {
	return &progressStore{dir: dir}
}

func (s *progressStore) path(profileID string) string {
	return filepath.Join(s.dir, profileID+".json")
}

// load reads the progress for a profile. Returns nil, nil if no progress exists.
func (s *progressStore) load(profileID string) (*Progress, error) {
	path := s.path(profileID)
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to read progress file %s: %w", path, err)
	}

	if len(data) == 0 {
		slog.Warn("empty progress file, treating as not started", "path", path)
		return nil, nil
	}

	var p Progress
	if err := json.Unmarshal(data, &p); err != nil {
		slog.Warn("corrupted progress file, treating as not started", "path", path, "error", err)
		return nil, nil
	}

	return &p, nil
}

// save writes the progress for a profile, creating directories as needed.
func (s *progressStore) save(p *Progress) error {
	if err := os.MkdirAll(s.dir, 0o700); err != nil {
		return fmt.Errorf("failed to create warmup directory %s: %w", s.dir, err)
	}

	data, err := json.MarshalIndent(p, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal progress data: %w", err)
	}

	path := s.path(p.ProfileID)
	if err := os.WriteFile(path, data, 0o600); err != nil {
		return fmt.Errorf("failed to write progress file %s: %w", path, err)
	}

	return nil
}
