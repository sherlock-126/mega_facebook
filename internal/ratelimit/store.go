package ratelimit

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
)

// counterFile represents the persisted daily action counters for a profile.
type counterFile struct {
	Date   string         `json:"date"`
	Counts map[string]int `json:"counts"`
}

// store handles file-based persistence of daily action counters per profile.
type store struct {
	dir string
}

// newStore creates a store that persists counters to the given directory.
func newStore(dir string) *store {
	return &store{dir: dir}
}

// counterPath returns the file path for a profile's counter file.
func (s *store) counterPath(profileID string) string {
	return filepath.Join(s.dir, profileID+".json")
}

// load reads the counter file for a profile. If the file doesn't exist,
// returns zero counts with today's date. If the file is from a previous day,
// returns zero counts (daily reset). If the file is corrupted, resets to zero
// and logs a warning.
func (s *store) load(profileID string) (*counterFile, error) {
	today := nowFunc().Format("2006-01-02")

	path := s.counterPath(profileID)
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return &counterFile{Date: today, Counts: make(map[string]int)}, nil
		}
		return nil, fmt.Errorf("failed to read counter file %s: %w", path, err)
	}

	var cf counterFile
	if err := json.Unmarshal(data, &cf); err != nil {
		slog.Warn("corrupted counter file, resetting", "path", path, "error", err)
		return &counterFile{Date: today, Counts: make(map[string]int)}, nil
	}

	// Daily reset: if the stored date differs from today, reset counts.
	if cf.Date != today {
		return &counterFile{Date: today, Counts: make(map[string]int)}, nil
	}

	if cf.Counts == nil {
		cf.Counts = make(map[string]int)
	}

	return &cf, nil
}

// save writes the counter file for a profile, creating directories as needed.
func (s *store) save(profileID string, cf *counterFile) error {
	if err := os.MkdirAll(s.dir, 0o700); err != nil {
		return fmt.Errorf("failed to create ratelimit directory %s: %w", s.dir, err)
	}

	data, err := json.MarshalIndent(cf, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal counter data: %w", err)
	}

	path := s.counterPath(profileID)
	if err := os.WriteFile(path, data, 0o600); err != nil {
		return fmt.Errorf("failed to write counter file %s: %w", path, err)
	}

	return nil
}

// increment loads the counter for a profile and action, increments it, and saves.
// Returns the new count.
func (s *store) increment(profileID string, action ActionType) (int, error) {
	cf, err := s.load(profileID)
	if err != nil {
		return 0, err
	}

	cf.Counts[string(action)]++
	newCount := cf.Counts[string(action)]

	if err := s.save(profileID, cf); err != nil {
		return 0, err
	}

	return newCount, nil
}

// count returns the current daily count for a profile and action.
func (s *store) count(profileID string, action ActionType) (int, error) {
	cf, err := s.load(profileID)
	if err != nil {
		return 0, err
	}
	return cf.Counts[string(action)], nil
}
