package warmup

import (
	"testing"
	"time"

	"github.com/sherlock-126/mega_facebook/internal/ratelimit"
)

func newTestManager(t *testing.T) *Manager {
	t.Helper()
	dir := t.TempDir()
	limiter, err := ratelimit.New(dir)
	if err != nil {
		t.Fatal(err)
	}
	mgr, err := NewManager(dir, limiter)
	if err != nil {
		t.Fatal(err)
	}
	return mgr
}

func TestNewManager_EmptyConfigDir(t *testing.T) {
	limiter, _ := ratelimit.New(t.TempDir())
	_, err := NewManager("", limiter)
	if err == nil {
		t.Fatal("expected error for empty config dir")
	}
}

func TestNewManager_NilLimiter(t *testing.T) {
	_, err := NewManager(t.TempDir(), nil)
	if err == nil {
		t.Fatal("expected error for nil limiter")
	}
}

func TestNewManager_ValidConfigDir(t *testing.T) {
	mgr := newTestManager(t)
	if mgr == nil {
		t.Fatal("manager is nil")
	}
}

func TestStartWarmup_NewProfile(t *testing.T) {
	mgr := newTestManager(t)

	if err := mgr.StartWarmup("profile-1"); err != nil {
		t.Fatalf("start failed: %v", err)
	}

	p, err := mgr.GetProgress("profile-1")
	if err != nil {
		t.Fatal(err)
	}
	if p == nil {
		t.Fatal("progress is nil after start")
	}
	if p.ProfileID != "profile-1" {
		t.Errorf("want profile_id profile-1, got %s", p.ProfileID)
	}
	if p.StartDate != nowFunc().Format("2006-01-02") {
		t.Errorf("want start_date %s, got %s", nowFunc().Format("2006-01-02"), p.StartDate)
	}
}

func TestStartWarmup_ExistingProfile(t *testing.T) {
	mgr := newTestManager(t)

	if err := mgr.StartWarmup("profile-1"); err != nil {
		t.Fatal(err)
	}

	err := mgr.StartWarmup("profile-1")
	if err == nil {
		t.Fatal("expected error for already started profile")
	}
}

func TestStartWarmup_EmptyProfileID(t *testing.T) {
	mgr := newTestManager(t)
	err := mgr.StartWarmup("")
	if err == nil {
		t.Fatal("expected error for empty profile ID")
	}
}

func TestCurrentPhase_NoProgress(t *testing.T) {
	mgr := newTestManager(t)

	_, err := mgr.CurrentPhase("nonexistent")
	if err == nil {
		t.Fatal("expected error for non-started profile")
	}
}

func TestCurrentPhase_Day1(t *testing.T) {
	orig := nowFunc
	defer func() { nowFunc = orig }()

	now := time.Date(2026, 3, 16, 14, 0, 0, 0, time.UTC)
	nowFunc = func() time.Time { return now }

	mgr := newTestManager(t)
	if err := mgr.StartWarmup("p1"); err != nil {
		t.Fatal(err)
	}

	phase, err := mgr.CurrentPhase("p1")
	if err != nil {
		t.Fatal(err)
	}
	if phase.Number != 1 {
		t.Errorf("want phase 1, got %d", phase.Number)
	}
}

func TestCurrentPhase_Day5(t *testing.T) {
	orig := nowFunc
	defer func() { nowFunc = orig }()

	// Start on March 16.
	startTime := time.Date(2026, 3, 16, 14, 0, 0, 0, time.UTC)
	nowFunc = func() time.Time { return startTime }

	mgr := newTestManager(t)
	if err := mgr.StartWarmup("p1"); err != nil {
		t.Fatal(err)
	}

	// Advance to March 20 (day 5).
	nowFunc = func() time.Time { return time.Date(2026, 3, 20, 14, 0, 0, 0, time.UTC) }

	phase, err := mgr.CurrentPhase("p1")
	if err != nil {
		t.Fatal(err)
	}
	if phase.Number != 2 {
		t.Errorf("day 5: want phase 2, got %d", phase.Number)
	}
}

func TestStatus_NotStarted(t *testing.T) {
	mgr := newTestManager(t)

	status, err := mgr.Status("unknown-profile")
	if err != nil {
		t.Fatal(err)
	}
	if status == "" {
		t.Fatal("status should not be empty")
	}
}

func TestStatus_InProgress(t *testing.T) {
	mgr := newTestManager(t)
	if err := mgr.StartWarmup("p1"); err != nil {
		t.Fatal(err)
	}

	status, err := mgr.Status("p1")
	if err != nil {
		t.Fatal(err)
	}
	if status == "" {
		t.Fatal("status should not be empty")
	}
}

func TestPlanSession_Phase1(t *testing.T) {
	orig := nowFunc
	origRand := randIntn
	defer func() {
		nowFunc = orig
		randIntn = origRand
	}()

	now := time.Date(2026, 3, 16, 14, 0, 0, 0, time.UTC)
	nowFunc = func() time.Time { return now }
	// Deterministic: always return 0 for min values.
	randIntn = func(n int) int { return 0 }

	mgr := newTestManager(t)
	if err := mgr.StartWarmup("p1"); err != nil {
		t.Fatal(err)
	}

	plan, err := mgr.PlanSession("p1")
	if err != nil {
		t.Fatal(err)
	}

	// Phase 1 should only have page_like.
	if _, ok := plan[ratelimit.ActionPageLike]; !ok {
		t.Error("phase 1 plan missing page_like")
	}
	if _, ok := plan[ratelimit.ActionFriendRequest]; ok {
		t.Error("phase 1 plan should not have friend_request")
	}
}

func TestPlanSession_Phase2(t *testing.T) {
	orig := nowFunc
	origRand := randIntn
	defer func() {
		nowFunc = orig
		randIntn = origRand
	}()

	// Start on March 16.
	startTime := time.Date(2026, 3, 16, 14, 0, 0, 0, time.UTC)
	nowFunc = func() time.Time { return startTime }
	randIntn = func(n int) int { return 0 }

	mgr := newTestManager(t)
	if err := mgr.StartWarmup("p1"); err != nil {
		t.Fatal(err)
	}

	// Advance to day 5 (phase 2).
	nowFunc = func() time.Time { return time.Date(2026, 3, 20, 14, 0, 0, 0, time.UTC) }

	plan, err := mgr.PlanSession("p1")
	if err != nil {
		t.Fatal(err)
	}

	if _, ok := plan[ratelimit.ActionFriendRequest]; !ok {
		t.Error("phase 2 plan missing friend_request")
	}
	if _, ok := plan[ratelimit.ActionGroupJoin]; !ok {
		t.Error("phase 2 plan missing group_join")
	}
}

func TestPlanSession_Phase4(t *testing.T) {
	orig := nowFunc
	origRand := randIntn
	defer func() {
		nowFunc = orig
		randIntn = origRand
	}()

	startTime := time.Date(2026, 3, 1, 14, 0, 0, 0, time.UTC)
	nowFunc = func() time.Time { return startTime }
	randIntn = func(n int) int { return 0 }

	mgr := newTestManager(t)
	if err := mgr.StartWarmup("p1"); err != nil {
		t.Fatal(err)
	}

	// Advance to day 20 (phase 4).
	nowFunc = func() time.Time { return time.Date(2026, 3, 20, 14, 0, 0, 0, time.UTC) }

	plan, err := mgr.PlanSession("p1")
	if err != nil {
		t.Fatal(err)
	}

	expectedActions := []ratelimit.ActionType{
		ratelimit.ActionPageLike,
		ratelimit.ActionFriendRequest,
		ratelimit.ActionGroupJoin,
		ratelimit.ActionPost,
		ratelimit.ActionComment,
	}

	for _, action := range expectedActions {
		if _, ok := plan[action]; !ok {
			t.Errorf("phase 4 plan missing %s", action)
		}
	}
}

func TestGetProgress_EmptyProfileID(t *testing.T) {
	mgr := newTestManager(t)
	_, err := mgr.GetProgress("")
	if err == nil {
		t.Fatal("expected error for empty profile ID")
	}
}
