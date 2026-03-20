package ratelimit

import (
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestStore_LoadEmpty(t *testing.T) {
	dir := t.TempDir()
	s := newStore(dir)

	cf, err := s.load("profile1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	today := time.Now().Format("2006-01-02")
	if cf.Date != today {
		t.Errorf("expected date %s, got %s", today, cf.Date)
	}
	if len(cf.Counts) != 0 {
		t.Errorf("expected empty counts, got %v", cf.Counts)
	}
}

func TestStore_SaveAndLoad(t *testing.T) {
	dir := t.TempDir()
	s := newStore(dir)

	today := time.Now().Format("2006-01-02")
	cf := &counterFile{
		Date: today,
		Counts: map[string]int{
			"friend_request": 5,
			"post":           2,
		},
	}

	if err := s.save("profile1", cf); err != nil {
		t.Fatalf("save failed: %v", err)
	}

	loaded, err := s.load("profile1")
	if err != nil {
		t.Fatalf("load failed: %v", err)
	}

	if loaded.Date != today {
		t.Errorf("expected date %s, got %s", today, loaded.Date)
	}
	if loaded.Counts["friend_request"] != 5 {
		t.Errorf("expected friend_request=5, got %d", loaded.Counts["friend_request"])
	}
	if loaded.Counts["post"] != 2 {
		t.Errorf("expected post=2, got %d", loaded.Counts["post"])
	}
}

func TestStore_DailyReset(t *testing.T) {
	dir := t.TempDir()
	s := newStore(dir)

	yesterday := time.Now().AddDate(0, 0, -1).Format("2006-01-02")
	cf := &counterFile{
		Date:   yesterday,
		Counts: map[string]int{"friend_request": 20},
	}
	if err := s.save("profile1", cf); err != nil {
		t.Fatalf("save failed: %v", err)
	}

	loaded, err := s.load("profile1")
	if err != nil {
		t.Fatalf("load failed: %v", err)
	}

	today := time.Now().Format("2006-01-02")
	if loaded.Date != today {
		t.Errorf("expected date %s (today), got %s", today, loaded.Date)
	}
	if loaded.Counts["friend_request"] != 0 {
		t.Errorf("expected friend_request=0 after daily reset, got %d", loaded.Counts["friend_request"])
	}
}

func TestStore_CorruptedFile(t *testing.T) {
	dir := t.TempDir()
	s := newStore(dir)

	path := s.counterPath("profile1")
	if err := os.WriteFile(path, []byte("not valid json!!!"), 0o600); err != nil {
		t.Fatalf("failed to write corrupted file: %v", err)
	}

	cf, err := s.load("profile1")
	if err != nil {
		t.Fatalf("expected no error on corrupted file, got: %v", err)
	}

	today := time.Now().Format("2006-01-02")
	if cf.Date != today {
		t.Errorf("expected date %s, got %s", today, cf.Date)
	}
	if len(cf.Counts) != 0 {
		t.Errorf("expected empty counts after corruption reset, got %v", cf.Counts)
	}
}

func TestStore_CreateDirectory(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "nested", "dir")
	s := newStore(dir)

	today := time.Now().Format("2006-01-02")
	cf := &counterFile{Date: today, Counts: map[string]int{"post": 1}}

	if err := s.save("profile1", cf); err != nil {
		t.Fatalf("save failed: %v", err)
	}

	// Verify directory was created.
	if _, err := os.Stat(dir); os.IsNotExist(err) {
		t.Errorf("expected directory %s to be created", dir)
	}
}

func TestStore_Increment(t *testing.T) {
	dir := t.TempDir()
	s := newStore(dir)

	count, err := s.increment("profile1", ActionFriendRequest)
	if err != nil {
		t.Fatalf("increment failed: %v", err)
	}
	if count != 1 {
		t.Errorf("expected count=1, got %d", count)
	}

	count, err = s.increment("profile1", ActionFriendRequest)
	if err != nil {
		t.Fatalf("increment failed: %v", err)
	}
	if count != 2 {
		t.Errorf("expected count=2, got %d", count)
	}

	// Different action should have its own count.
	count, err = s.increment("profile1", ActionPost)
	if err != nil {
		t.Fatalf("increment failed: %v", err)
	}
	if count != 1 {
		t.Errorf("expected post count=1, got %d", count)
	}
}
