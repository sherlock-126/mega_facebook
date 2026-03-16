package humanize

import (
	"math/rand"
	"time"
)

const (
	// typoProbability is the chance of a typo per character (~5%).
	typoProbability = 0.05

	// backspaceRune represents a backspace key action.
	backspaceRune = '\b'
)

// adjacentKeys maps characters to their keyboard neighbors for realistic typos.
var adjacentKeys = map[rune][]rune{
	'a': {'s', 'q', 'z', 'w'},
	'b': {'v', 'n', 'g', 'h'},
	'c': {'x', 'v', 'd', 'f'},
	'd': {'s', 'f', 'e', 'r', 'c', 'x'},
	'e': {'w', 'r', 'd', 's'},
	'f': {'d', 'g', 'r', 't', 'v', 'c'},
	'g': {'f', 'h', 't', 'y', 'b', 'v'},
	'h': {'g', 'j', 'y', 'u', 'n', 'b'},
	'i': {'u', 'o', 'k', 'j'},
	'j': {'h', 'k', 'u', 'i', 'n', 'm'},
	'k': {'j', 'l', 'i', 'o', 'm'},
	'l': {'k', 'o', 'p'},
	'm': {'n', 'j', 'k'},
	'n': {'b', 'm', 'h', 'j'},
	'o': {'i', 'p', 'k', 'l'},
	'p': {'o', 'l'},
	'q': {'w', 'a'},
	'r': {'e', 't', 'd', 'f'},
	's': {'a', 'd', 'w', 'e', 'z', 'x'},
	't': {'r', 'y', 'f', 'g'},
	'u': {'y', 'i', 'h', 'j'},
	'v': {'c', 'b', 'f', 'g'},
	'w': {'q', 'e', 'a', 's'},
	'x': {'z', 'c', 's', 'd'},
	'y': {'t', 'u', 'g', 'h'},
	'z': {'a', 'x', 's'},
}

// TypePlan represents a complete typing simulation plan for a string.
type TypePlan struct {
	// Actions is the sequence of key actions to execute.
	Actions []TypeAction
}

// TypeAction represents a single keystroke action in a typing plan.
type TypeAction struct {
	// Char is the character to type.
	Char rune
	// Delay is the time to wait before typing this character.
	Delay time.Duration
	// IsTypo indicates this character is intentionally wrong.
	IsTypo bool
	// Correction contains the backspace + correct character actions if IsTypo is true.
	Correction []TypeAction
}

// PlanTyping generates a typing plan for the given text, including
// randomized per-character delays and occasional typos with corrections.
// Returns an empty plan for empty input.
func PlanTyping(text string) TypePlan {
	if len(text) == 0 {
		return TypePlan{}
	}

	runes := []rune(text)
	actions := make([]TypeAction, 0, len(runes))

	for i, ch := range runes {
		delay := TypeDelay()

		// Only generate typos for lowercase letters with adjacent keys,
		// not for the first character (looks unnatural), and not for single-char input.
		if len(runes) > 1 && i > 0 && rand.Float64() < typoProbability {
			if typoChar, ok := nearbyKey(ch); ok {
				// Create typo action with correction sequence.
				action := TypeAction{
					Char:   typoChar,
					Delay:  delay,
					IsTypo: true,
					Correction: []TypeAction{
						{
							Char:  backspaceRune,
							Delay: RandomDelay(50, 100),
						},
						{
							Char:  ch,
							Delay: RandomDelay(80, 180),
						},
					},
				}
				actions = append(actions, action)
				continue
			}
		}

		actions = append(actions, TypeAction{
			Char:  ch,
			Delay: delay,
		})
	}

	return TypePlan{Actions: actions}
}

// nearbyKey returns a random adjacent key for the given character, if available.
// Returns the typo character and true if a nearby key exists, or 0 and false otherwise.
func nearbyKey(ch rune) (rune, bool) {
	// Check lowercase version.
	lower := ch
	if ch >= 'A' && ch <= 'Z' {
		lower = ch + 32
	}

	neighbors, ok := adjacentKeys[lower]
	if !ok || len(neighbors) == 0 {
		return 0, false
	}

	typo := neighbors[rand.Intn(len(neighbors))]

	// Preserve original case.
	if ch >= 'A' && ch <= 'Z' {
		typo = typo - 32
	}

	return typo, true
}
