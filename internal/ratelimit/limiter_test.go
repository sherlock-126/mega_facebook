package ratelimit

import (
	"testing"
	"time"
)

func TestNew_CreatesLimiter(t *testing.T) {
	dir := t.TempDir()
	l, err := New(dir)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if l == nil {
		t.Fatal("expected non-nil limiter")
	}
}

func TestNew_EmptyDir(t *testing.T) {
	_, err := New("")
	if err == nil {
		t.Fatal("expected error for empty config dir")
	}
}

func TestAllow_UnderLimit(t *testing.T) {
	dir := t.TempDir()
	l, err := New(dir)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	allowed, err := l.Allow("profile1", ActionFriendRequest)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !allowed {
		t.Error("expected action to be allowed under limit")
	}
}

func TestAllow_AtLimit(t *testing.T) {
	dir := t.TempDir()
	l, err := New(dir)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Default for AccountNew friend_request is 5.
	for i := 0; i < 5; i++ {
		allowed, err := l.Allow("profile1", ActionFriendRequest)
		if err != nil {
			t.Fatalf("unexpected error on allow %d: %v", i, err)
		}
		if !allowed {
			t.Fatalf("expected action to be allowed at count %d", i)
		}
	}

	// 6th should be denied.
	allowed, err := l.Allow("profile1", ActionFriendRequest)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if allowed {
		t.Error("expected action to be denied at limit")
	}
}

func TestAllow_IncrementsCount(t *testing.T) {
	dir := t.TempDir()
	l, err := New(dir)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	l.Allow("profile1", ActionPost)

	remaining, err := l.Remaining("profile1", ActionPost)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	// AccountNew post limit is 2, after 1 allowed, remaining should be 1.
	if remaining != 1 {
		t.Errorf("expected remaining=1, got %d", remaining)
	}
}

func TestAllow_EmptyProfileID(t *testing.T) {
	dir := t.TempDir()
	l, _ := New(dir)

	_, err := l.Allow("", ActionFriendRequest)
	if err == nil {
		t.Fatal("expected error for empty profile ID")
	}
}

func TestAllow_UnknownAction(t *testing.T) {
	dir := t.TempDir()
	l, _ := New(dir)

	_, err := l.Allow("profile1", ActionType("unknown_action"))
	if err == nil {
		t.Fatal("expected error for unknown action type")
	}
}

func TestAllow_DefaultsToNewAge(t *testing.T) {
	dir := t.TempDir()
	l, _ := New(dir)

	// Without SetProfileAge, should use AccountNew limits.
	// AccountNew friend_request = 5. Allow 5, deny 6th.
	for i := 0; i < 5; i++ {
		allowed, _ := l.Allow("profile1", ActionFriendRequest)
		if !allowed {
			t.Fatalf("expected allowed at count %d with new account limits", i)
		}
	}

	allowed, _ := l.Allow("profile1", ActionFriendRequest)
	if allowed {
		t.Error("expected denied at new account limit of 5")
	}
}

func TestAllow_EstablishedHigherLimits(t *testing.T) {
	dir := t.TempDir()
	l, _ := New(dir)
	l.SetProfileAge("profile1", AccountEstablished)

	// AccountEstablished friend_request = 25.
	for i := 0; i < 25; i++ {
		allowed, err := l.Allow("profile1", ActionFriendRequest)
		if err != nil {
			t.Fatalf("unexpected error at %d: %v", i, err)
		}
		if !allowed {
			t.Fatalf("expected allowed at count %d with established account (limit 25)", i)
		}
	}

	allowed, _ := l.Allow("profile1", ActionFriendRequest)
	if allowed {
		t.Error("expected denied at established limit of 25")
	}
}

func TestAllow_GrowingMediumLimits(t *testing.T) {
	dir := t.TempDir()
	l, _ := New(dir)
	l.SetProfileAge("profile1", AccountGrowing)

	// AccountGrowing friend_request = 15.
	for i := 0; i < 15; i++ {
		allowed, _ := l.Allow("profile1", ActionFriendRequest)
		if !allowed {
			t.Fatalf("expected allowed at count %d with growing account (limit 15)", i)
		}
	}

	allowed, _ := l.Allow("profile1", ActionFriendRequest)
	if allowed {
		t.Error("expected denied at growing limit of 15")
	}
}

func TestSetProfileLimits_Override(t *testing.T) {
	dir := t.TempDir()
	l, _ := New(dir)

	l.SetProfileLimits("profile1", map[ActionType]int{
		ActionFriendRequest: 3,
	})

	for i := 0; i < 3; i++ {
		allowed, _ := l.Allow("profile1", ActionFriendRequest)
		if !allowed {
			t.Fatalf("expected allowed at count %d with override limit 3", i)
		}
	}

	allowed, _ := l.Allow("profile1", ActionFriendRequest)
	if allowed {
		t.Error("expected denied at override limit of 3")
	}
}

func TestSetProfileLimits_OverrideZero(t *testing.T) {
	dir := t.TempDir()
	l, _ := New(dir)

	l.SetProfileLimits("profile1", map[ActionType]int{
		ActionPost: 0,
	})

	allowed, err := l.Allow("profile1", ActionPost)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if allowed {
		t.Error("expected action denied when limit overridden to 0")
	}
}

func TestRemaining_ReturnsCorrectCount(t *testing.T) {
	dir := t.TempDir()
	l, _ := New(dir)
	l.SetProfileAge("profile1", AccountEstablished)

	// Established post limit = 6.
	l.Allow("profile1", ActionPost)
	l.Allow("profile1", ActionPost)

	remaining, err := l.Remaining("profile1", ActionPost)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if remaining != 4 {
		t.Errorf("expected remaining=4, got %d", remaining)
	}
}

func TestRemaining_UnknownAction(t *testing.T) {
	dir := t.TempDir()
	l, _ := New(dir)

	_, err := l.Remaining("profile1", ActionType("nope"))
	if err == nil {
		t.Fatal("expected error for unknown action")
	}
}

func TestStatus_AllActions(t *testing.T) {
	dir := t.TempDir()
	l, _ := New(dir)

	status, err := l.Status("profile1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(status) != len(allActionTypes) {
		t.Errorf("expected %d action types in status, got %d", len(allActionTypes), len(status))
	}

	for _, action := range allActionTypes {
		s, ok := status[action]
		if !ok {
			t.Errorf("missing status for action %s", action)
			continue
		}
		if s.Count != 0 {
			t.Errorf("expected count=0 for %s, got %d", action, s.Count)
		}
		if s.Limit <= 0 {
			t.Errorf("expected positive limit for %s, got %d", action, s.Limit)
		}
		if s.Remaining != s.Limit {
			t.Errorf("expected remaining=limit for %s, got remaining=%d limit=%d", action, s.Remaining, s.Limit)
		}
	}
}

func TestTake_BlocksAndIncrements(t *testing.T) {
	dir := t.TempDir()
	l, _ := New(dir)

	err := l.Take("profile1", ActionPost)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	remaining, _ := l.Remaining("profile1", ActionPost)
	// AccountNew post limit = 2, Take increments once via Allow.
	if remaining != 1 {
		t.Errorf("expected remaining=1 after Take, got %d", remaining)
	}
}

func TestTake_DailyLimitReached(t *testing.T) {
	dir := t.TempDir()
	l, _ := New(dir)

	// AccountNew post limit = 2.
	l.Allow("profile1", ActionPost)
	l.Allow("profile1", ActionPost)

	err := l.Take("profile1", ActionPost)
	if err == nil {
		t.Fatal("expected error when daily limit reached")
	}
}

func TestAllow_DayRollover(t *testing.T) {
	dir := t.TempDir()
	l, _ := New(dir)

	// Use up the limit (AccountNew post = 2).
	l.Allow("profile1", ActionPost)
	l.Allow("profile1", ActionPost)

	allowed, _ := l.Allow("profile1", ActionPost)
	if allowed {
		t.Fatal("expected denied at limit")
	}

	// Simulate day change by overriding nowFunc.
	original := nowFunc
	defer func() { nowFunc = original }()
	nowFunc = func() time.Time {
		return time.Now().AddDate(0, 0, 1)
	}

	// After day rollover, should be allowed again.
	allowed, err := l.Allow("profile1", ActionPost)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !allowed {
		t.Error("expected action allowed after day rollover")
	}
}

func TestAllActionTypes(t *testing.T) {
	dir := t.TempDir()
	l, _ := New(dir)

	for _, action := range allActionTypes {
		allowed, err := l.Allow("profile1", action)
		if err != nil {
			t.Errorf("unexpected error for %s: %v", action, err)
		}
		if !allowed {
			t.Errorf("expected %s to be allowed on first use", action)
		}

		remaining, err := l.Remaining("profile1", action)
		if err != nil {
			t.Errorf("unexpected error getting remaining for %s: %v", action, err)
		}
		if remaining < 0 {
			t.Errorf("expected non-negative remaining for %s, got %d", action, remaining)
		}
	}
}

func TestStatus_EmptyProfileID(t *testing.T) {
	dir := t.TempDir()
	l, _ := New(dir)

	_, err := l.Status("")
	if err == nil {
		t.Fatal("expected error for empty profile ID")
	}
}

func TestRemaining_EmptyProfileID(t *testing.T) {
	dir := t.TempDir()
	l, _ := New(dir)

	_, err := l.Remaining("", ActionPost)
	if err == nil {
		t.Fatal("expected error for empty profile ID")
	}
}

func TestTake_EmptyProfileID(t *testing.T) {
	dir := t.TempDir()
	l, _ := New(dir)

	err := l.Take("", ActionPost)
	if err == nil {
		t.Fatal("expected error for empty profile ID")
	}
}

func TestTake_UnknownAction(t *testing.T) {
	dir := t.TempDir()
	l, _ := New(dir)

	err := l.Take("profile1", ActionType("bad"))
	if err == nil {
		t.Fatal("expected error for unknown action type")
	}
}
