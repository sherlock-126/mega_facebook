package warmup

import (
	"testing"

	"github.com/sherlock-126/mega_facebook/internal/ratelimit"
)

func TestGetPhase_Day1(t *testing.T) {
	p := GetPhase(1)
	if p.Number != 1 {
		t.Errorf("day 1: want phase 1, got phase %d", p.Number)
	}
	if p.Name != "passive" {
		t.Errorf("day 1: want name passive, got %s", p.Name)
	}
}

func TestGetPhase_Day3(t *testing.T) {
	p := GetPhase(3)
	if p.Number != 1 {
		t.Errorf("day 3: want phase 1, got phase %d", p.Number)
	}
}

func TestGetPhase_Day4(t *testing.T) {
	p := GetPhase(4)
	if p.Number != 2 {
		t.Errorf("day 4: want phase 2, got phase %d", p.Number)
	}
	if p.Name != "social" {
		t.Errorf("day 4: want name social, got %s", p.Name)
	}
}

func TestGetPhase_Day7(t *testing.T) {
	p := GetPhase(7)
	if p.Number != 2 {
		t.Errorf("day 7: want phase 2, got phase %d", p.Number)
	}
}

func TestGetPhase_Day8(t *testing.T) {
	p := GetPhase(8)
	if p.Number != 3 {
		t.Errorf("day 8: want phase 3, got phase %d", p.Number)
	}
	if p.Name != "active" {
		t.Errorf("day 8: want name active, got %s", p.Name)
	}
}

func TestGetPhase_Day14(t *testing.T) {
	p := GetPhase(14)
	if p.Number != 3 {
		t.Errorf("day 14: want phase 3, got phase %d", p.Number)
	}
}

func TestGetPhase_Day15(t *testing.T) {
	p := GetPhase(15)
	if p.Number != 4 {
		t.Errorf("day 15: want phase 4, got phase %d", p.Number)
	}
	if p.Name != "established" {
		t.Errorf("day 15: want name established, got %s", p.Name)
	}
}

func TestGetPhase_Day30Plus(t *testing.T) {
	p := GetPhase(45)
	if p.Number != 4 {
		t.Errorf("day 45: want phase 4, got phase %d", p.Number)
	}
}

func TestGetPhase_Day0(t *testing.T) {
	p := GetPhase(0)
	if p.Number != 1 {
		t.Errorf("day 0: want phase 1 (clamped), got phase %d", p.Number)
	}
}

func TestGetPhase_NegativeDay(t *testing.T) {
	p := GetPhase(-5)
	if p.Number != 1 {
		t.Errorf("day -5: want phase 1 (clamped), got phase %d", p.Number)
	}
}

func TestPhases_DayRangesContinuous(t *testing.T) {
	// Verify no gaps between phases (except last which is open-ended).
	for i := 0; i < len(Phases)-1; i++ {
		current := Phases[i]
		next := Phases[i+1]
		if current.DayEnd+1 != next.DayStart {
			t.Errorf("gap between phase %d (ends %d) and phase %d (starts %d)",
				current.Number, current.DayEnd, next.Number, next.DayStart)
		}
	}
}

func TestPhases_ActionsHaveValidRanges(t *testing.T) {
	for _, phase := range Phases {
		for _, ac := range phase.Actions {
			if ac.MinPerDay > ac.MaxPerDay {
				t.Errorf("phase %d action %s: min (%d) > max (%d)",
					phase.Number, ac.Type, ac.MinPerDay, ac.MaxPerDay)
			}
			if ac.MinPerDay < 0 {
				t.Errorf("phase %d action %s: min (%d) is negative",
					phase.Number, ac.Type, ac.MinPerDay)
			}
		}
	}
}

func TestPhases_AllActionsAreValidTypes(t *testing.T) {
	validTypes := map[ratelimit.ActionType]bool{
		ratelimit.ActionFriendRequest: true,
		ratelimit.ActionGroupJoin:     true,
		ratelimit.ActionPost:          true,
		ratelimit.ActionComment:       true,
		ratelimit.ActionPageLike:      true,
		ratelimit.ActionMessage:       true,
		ratelimit.ActionGroupInvite:   true,
	}

	for _, phase := range Phases {
		for _, ac := range phase.Actions {
			if !validTypes[ac.Type] {
				t.Errorf("phase %d action type %q not a valid ratelimit.ActionType",
					phase.Number, ac.Type)
			}
		}
	}
}

func TestPhases_AllPhasesHaveActions(t *testing.T) {
	for _, phase := range Phases {
		if len(phase.Actions) == 0 {
			t.Errorf("phase %d (%s) has no actions", phase.Number, phase.Name)
		}
	}
}
