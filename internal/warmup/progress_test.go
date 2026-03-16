package warmup

import (
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestLoadProgress_FileNotExist(t *testing.T) {
	dir := t.TempDir()
	s := newProgressStore(dir)

	p, err := s.load("nonexistent")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if p != nil {
		t.Fatalf("expected nil progress, got %+v", p)
	}
}

func TestSaveAndLoadProgress(t *testing.T) {
	dir := t.TempDir()
	s := newProgressStore(dir)

	original := &Progress{
		ProfileID: "test-profile",
		StartDate: "2026-03-16",
		Sessions: []SessionLog{
			{
				Date:    "2026-03-16",
				Phase:   1,
				Actions: map[string]int{"page_like": 2},
			},
		},
	}

	if err := s.save(original); err != nil {
		t.Fatalf("save failed: %v", err)
	}

	loaded, err := s.load("test-profile")
	if err != nil {
		t.Fatalf("load failed: %v", err)
	}
	if loaded == nil {
		t.Fatal("loaded progress is nil")
	}

	if loaded.ProfileID != original.ProfileID {
		t.Errorf("profile_id: want %s, got %s", original.ProfileID, loaded.ProfileID)
	}
	if loaded.StartDate != original.StartDate {
		t.Errorf("start_date: want %s, got %s", original.StartDate, loaded.StartDate)
	}
	if len(loaded.Sessions) != 1 {
		t.Fatalf("sessions: want 1, got %d", len(loaded.Sessions))
	}
	if loaded.Sessions[0].Phase != 1 {
		t.Errorf("session phase: want 1, got %d", loaded.Sessions[0].Phase)
	}
	if loaded.Sessions[0].Actions["page_like"] != 2 {
		t.Errorf("session page_like: want 2, got %d", loaded.Sessions[0].Actions["page_like"])
	}
}

func TestLoadProgress_CorruptedFile(t *testing.T) {
	dir := t.TempDir()
	s := newProgressStore(dir)

	// Write corrupted data.
	path := filepath.Join(dir, "corrupt.json")
	if err := os.WriteFile(path, []byte("{invalid json"), 0o600); err != nil {
		t.Fatal(err)
	}

	p, err := s.load("corrupt")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if p != nil {
		t.Fatalf("expected nil for corrupted file, got %+v", p)
	}
}

func TestLoadProgress_EmptyFile(t *testing.T) {
	dir := t.TempDir()
	s := newProgressStore(dir)

	path := filepath.Join(dir, "empty.json")
	if err := os.WriteFile(path, []byte(""), 0o600); err != nil {
		t.Fatal(err)
	}

	p, err := s.load("empty")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if p != nil {
		t.Fatalf("expected nil for empty file, got %+v", p)
	}
}

func TestCurrentDay_SameDay(t *testing.T) {
	orig := nowFunc
	defer func() { nowFunc = orig }()

	now := time.Date(2026, 3, 16, 14, 0, 0, 0, time.UTC)
	nowFunc = func() time.Time { return now }

	p := &Progress{StartDate: "2026-03-16"}
	if day := p.CurrentDay(); day != 1 {
		t.Errorf("same day: want 1, got %d", day)
	}
}

func TestCurrentDay_ThreeDaysLater(t *testing.T) {
	orig := nowFunc
	defer func() { nowFunc = orig }()

	now := time.Date(2026, 3, 19, 14, 0, 0, 0, time.UTC)
	nowFunc = func() time.Time { return now }

	p := &Progress{StartDate: "2026-03-16"}
	if day := p.CurrentDay(); day != 4 {
		t.Errorf("3 days later: want 4, got %d", day)
	}
}

func TestCurrentDay_ThirtyDaysLater(t *testing.T) {
	orig := nowFunc
	defer func() { nowFunc = orig }()

	now := time.Date(2026, 4, 15, 14, 0, 0, 0, time.UTC)
	nowFunc = func() time.Time { return now }

	p := &Progress{StartDate: "2026-03-16"}
	if day := p.CurrentDay(); day != 31 {
		t.Errorf("30 days later: want 31, got %d", day)
	}
}

func TestCurrentDay_FutureStartDate(t *testing.T) {
	orig := nowFunc
	defer func() { nowFunc = orig }()

	now := time.Date(2026, 3, 16, 14, 0, 0, 0, time.UTC)
	nowFunc = func() time.Time { return now }

	p := &Progress{StartDate: "2026-03-20"}
	if day := p.CurrentDay(); day != 1 {
		t.Errorf("future start: want 1 (clamped), got %d", day)
	}
}

func TestAddSession(t *testing.T) {
	p := &Progress{
		ProfileID: "test",
		StartDate: "2026-03-16",
		Sessions:  []SessionLog{},
	}

	p.AddSession(SessionLog{
		Date:    "2026-03-16",
		Phase:   1,
		Actions: map[string]int{"page_like": 3},
	})

	if len(p.Sessions) != 1 {
		t.Fatalf("want 1 session, got %d", len(p.Sessions))
	}

	p.AddSession(SessionLog{
		Date:    "2026-03-16",
		Phase:   1,
		Actions: map[string]int{"page_like": 2},
	})

	if len(p.Sessions) != 2 {
		t.Fatalf("want 2 sessions (multiple same day), got %d", len(p.Sessions))
	}
}

func TestProgressDir_CreatesDirectory(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "nested", "warmup")
	s := newProgressStore(dir)

	p := &Progress{
		ProfileID: "test",
		StartDate: "2026-03-16",
		Sessions:  []SessionLog{},
	}

	if err := s.save(p); err != nil {
		t.Fatalf("save failed: %v", err)
	}

	if _, err := os.Stat(dir); os.IsNotExist(err) {
		t.Fatal("directory was not created")
	}
}
