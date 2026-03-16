package humanize

import (
	"testing"
)

func TestPlanTyping_EmptyString(t *testing.T) {
	plan := PlanTyping("")
	if len(plan.Actions) != 0 {
		t.Fatalf("expected empty plan, got %d actions", len(plan.Actions))
	}
}

func TestPlanTyping_SingleChar(t *testing.T) {
	// Single character should never have typos.
	for i := 0; i < 100; i++ {
		plan := PlanTyping("a")
		if len(plan.Actions) != 1 {
			t.Fatalf("expected 1 action, got %d", len(plan.Actions))
		}
		if plan.Actions[0].IsTypo {
			t.Fatal("single character should not have typos")
		}
		if plan.Actions[0].Char != 'a' {
			t.Fatalf("expected 'a', got %c", plan.Actions[0].Char)
		}
	}
}

func TestPlanTyping_AllCharsPresent(t *testing.T) {
	text := "hello world"
	plan := PlanTyping(text)

	// Extract the final characters (accounting for typo corrections).
	var result []rune
	for _, action := range plan.Actions {
		if action.IsTypo {
			// The correction's last action has the correct char.
			if len(action.Correction) > 0 {
				result = append(result, action.Correction[len(action.Correction)-1].Char)
			}
		} else {
			result = append(result, action.Char)
		}
	}

	if string(result) != text {
		t.Fatalf("reconstructed text = %q, want %q", string(result), text)
	}
}

func TestPlanTyping_DelayRange(t *testing.T) {
	plan := PlanTyping("this is a test string for delay checking")

	for i, action := range plan.Actions {
		ms := action.Delay.Milliseconds()
		if ms < int64(TypeDelayMin) || ms > int64(TypeDelayMax) {
			t.Fatalf("action[%d] delay = %dms, want [%d, %d]", i, ms, TypeDelayMin, TypeDelayMax)
		}
	}
}

func TestPlanTyping_TypoHasCorrection(t *testing.T) {
	// Generate many plans to find at least one typo.
	for trial := 0; trial < 200; trial++ {
		plan := PlanTyping("the quick brown fox jumps over the lazy dog")
		for _, action := range plan.Actions {
			if action.IsTypo {
				if len(action.Correction) == 0 {
					t.Fatal("typo action has empty correction")
				}
				return // test passed
			}
		}
	}
	t.Fatal("no typos generated in 200 trials of a 43-char string")
}

func TestPlanTyping_CorrectionSequence(t *testing.T) {
	// Find a typo and verify correction structure.
	for trial := 0; trial < 200; trial++ {
		plan := PlanTyping("the quick brown fox jumps over the lazy dog")
		for _, action := range plan.Actions {
			if action.IsTypo && len(action.Correction) >= 2 {
				// First correction action should be backspace.
				if action.Correction[0].Char != backspaceRune {
					t.Fatalf("correction[0] = %c, want backspace", action.Correction[0].Char)
				}
				// Last correction action should be a printable character.
				lastChar := action.Correction[len(action.Correction)-1].Char
				if lastChar == backspaceRune {
					t.Fatal("last correction action should not be backspace")
				}
				// Correction delays should be positive.
				for i, c := range action.Correction {
					if c.Delay <= 0 {
						t.Fatalf("correction[%d] has non-positive delay", i)
					}
				}
				return // test passed
			}
		}
	}
	t.Fatal("no correctable typos found in 200 trials")
}

func TestPlanTyping_FirstCharNeverTypo(t *testing.T) {
	// First character should never be a typo.
	for i := 0; i < 500; i++ {
		plan := PlanTyping("hello world testing")
		if len(plan.Actions) > 0 && plan.Actions[0].IsTypo {
			t.Fatal("first character should never be a typo")
		}
	}
}

func TestPlanTyping_LongString_TypoRate(t *testing.T) {
	// With ~5% typo rate, a 1000-char string should have roughly 50 typos.
	// We check it's in a reasonable range (1-150) over multiple trials.
	text := make([]rune, 1000)
	for i := range text {
		text[i] = 'a' + rune(i%26) // all lowercase letters
	}

	totalTypos := 0
	trials := 10
	for trial := 0; trial < trials; trial++ {
		plan := PlanTyping(string(text))
		for _, action := range plan.Actions {
			if action.IsTypo {
				totalTypos++
			}
		}
	}

	avgTypos := totalTypos / trials
	// Expect roughly 50 typos per 1000 chars (5%), allow wide range.
	if avgTypos < 10 || avgTypos > 150 {
		t.Fatalf("average typos per 1000 chars = %d, expected roughly 50 (range 10-150)", avgTypos)
	}
}

func TestNearbyKey_LowercaseLetter(t *testing.T) {
	typo, ok := nearbyKey('a')
	if !ok {
		t.Fatal("expected nearby key for 'a'")
	}
	// Check it's one of the expected neighbors.
	expected := map[rune]bool{'s': true, 'q': true, 'z': true, 'w': true}
	if !expected[typo] {
		t.Fatalf("unexpected typo %c for 'a'", typo)
	}
}

func TestNearbyKey_UppercaseLetter(t *testing.T) {
	typo, ok := nearbyKey('A')
	if !ok {
		t.Fatal("expected nearby key for 'A'")
	}
	// Should return uppercase version of neighbor.
	if typo < 'A' || typo > 'Z' {
		t.Fatalf("expected uppercase typo, got %c", typo)
	}
}

func TestNearbyKey_NonLetter(t *testing.T) {
	_, ok := nearbyKey('5')
	if ok {
		t.Fatal("expected no nearby key for '5'")
	}
}
