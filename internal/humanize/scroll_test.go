package humanize

import (
	"math"
	"testing"
)

func TestScrollPlan_DistanceSum(t *testing.T) {
	cfg := ScrollConfig{
		Direction: "down",
		Distance:  1000,
		Steps:     10,
	}
	steps := ScrollPlan(cfg)

	sum := 0
	for _, s := range steps {
		sum += s.DeltaY
	}
	if sum != 1000 {
		t.Fatalf("sum of DeltaY = %d, want 1000", sum)
	}
}

func TestScrollPlan_DistanceSumUp(t *testing.T) {
	cfg := ScrollConfig{
		Direction: "up",
		Distance:  500,
		Steps:     5,
	}
	steps := ScrollPlan(cfg)

	sum := 0
	for _, s := range steps {
		sum += s.DeltaY
	}
	if sum != -500 {
		t.Fatalf("sum of DeltaY = %d, want -500", sum)
	}
}

func TestScrollPlan_StepCount(t *testing.T) {
	cfg := ScrollConfig{
		Direction: "down",
		Distance:  1000,
		Steps:     8,
	}
	steps := ScrollPlan(cfg)

	if len(steps) != 8 {
		t.Fatalf("got %d steps, want 8", len(steps))
	}
}

func TestScrollPlan_ZeroDistance(t *testing.T) {
	cfg := ScrollConfig{
		Direction: "down",
		Distance:  0,
		Steps:     5,
	}
	steps := ScrollPlan(cfg)

	if steps != nil {
		t.Fatalf("expected nil for zero distance, got %d steps", len(steps))
	}
}

func TestScrollPlan_WithReadingPause(t *testing.T) {
	cfg := ScrollConfig{
		Direction:    "down",
		Distance:     2000,
		Steps:        15,
		ReadingPause: true,
	}

	// Run multiple times since pauses are random.
	pauseFound := false
	for trial := 0; trial < 20; trial++ {
		steps := ScrollPlan(cfg)
		for _, s := range steps {
			if s.Pause > 0 {
				pauseFound = true
				break
			}
		}
		if pauseFound {
			break
		}
	}
	if !pauseFound {
		t.Fatal("expected at least one step with a reading pause")
	}
}

func TestScrollPlan_WithoutReadingPause(t *testing.T) {
	cfg := ScrollConfig{
		Direction:    "down",
		Distance:     1000,
		Steps:        10,
		ReadingPause: false,
	}
	steps := ScrollPlan(cfg)

	for i, s := range steps {
		if s.Pause > 0 {
			t.Fatalf("step %d has pause %v, expected no pauses", i, s.Pause)
		}
	}
}

func TestScrollPlan_VariableSpeed(t *testing.T) {
	cfg := ScrollConfig{
		Direction: "down",
		Distance:  1000,
		Steps:     10,
	}

	// Check that steps have varying DeltaY values (not all identical).
	// Run a few trials since there's random variation.
	varied := false
	for trial := 0; trial < 10; trial++ {
		steps := ScrollPlan(cfg)
		values := make(map[int]bool)
		for _, s := range steps {
			values[s.DeltaY] = true
		}
		if len(values) > 1 {
			varied = true
			break
		}
	}
	if !varied {
		t.Fatal("scroll steps appear to have constant DeltaY values")
	}
}

func TestScrollPlan_ReadingPauseRange(t *testing.T) {
	cfg := ScrollConfig{
		Direction:    "down",
		Distance:     2000,
		Steps:        15,
		ReadingPause: true,
	}

	for trial := 0; trial < 50; trial++ {
		steps := ScrollPlan(cfg)
		for _, s := range steps {
			if s.Pause > 0 {
				ms := s.Pause.Milliseconds()
				if ms < int64(readingPauseMin) || ms > int64(readingPauseMax) {
					t.Fatalf("reading pause = %dms, want [%d, %d]", ms, readingPauseMin, readingPauseMax)
				}
			}
		}
	}
}

func TestScrollPlan_AllStepsPositiveDelay(t *testing.T) {
	cfg := ScrollConfig{
		Direction: "down",
		Distance:  500,
		Steps:     5,
	}
	steps := ScrollPlan(cfg)

	for i, s := range steps {
		if s.Delay <= 0 {
			t.Fatalf("step %d has non-positive delay: %v", i, s.Delay)
		}
	}
}

func TestVariablePartition_SumsToTotal(t *testing.T) {
	for _, total := range []int{10, 100, 1000, 7, 3} {
		parts := variablePartition(total, 5)
		sum := 0
		for _, p := range parts {
			sum += p
		}
		if sum != total {
			t.Fatalf("variablePartition(%d, 5) sums to %d", total, sum)
		}
	}
}

func TestVariablePartition_AllPositive(t *testing.T) {
	for trial := 0; trial < 100; trial++ {
		parts := variablePartition(100, 10)
		for i, p := range parts {
			if p < 1 {
				t.Fatalf("part[%d] = %d, want >= 1", i, p)
			}
		}
	}
}

func TestVariablePartition_SmallTotal(t *testing.T) {
	// When total < n, should only return `total` parts.
	parts := variablePartition(3, 10)
	if len(parts) != 3 {
		t.Fatalf("got %d parts, want 3", len(parts))
	}
	sum := 0
	for _, p := range parts {
		sum += p
		if math.Abs(float64(p)-1) > 0 {
			t.Fatalf("expected all parts to be 1, got %d", p)
		}
	}
	if sum != 3 {
		t.Fatalf("sum = %d, want 3", sum)
	}
}
