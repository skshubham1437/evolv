package services

import (
	"time"
)

type StreakResult struct {
	NewStreak              int
	ShieldsRemaining       int
	ShieldActivated        bool
	ShieldsExhausted       bool
	ShieldsUsed            int
}

// EvaluateCompletion calculates the new streak state when logging a habit today.
func EvaluateCompletion(currentStreak int, shieldActive bool, shieldsRemaining int, loggedYesterday bool) StreakResult {
	result := StreakResult{
		NewStreak:        1,
		ShieldsRemaining: shieldsRemaining,
	}

	if loggedYesterday {
		result.NewStreak = currentStreak + 1
	} else if shieldActive && shieldsRemaining > 0 {
		result.NewStreak = currentStreak + 1
		result.ShieldsRemaining = shieldsRemaining - 1
		result.ShieldActivated = true
	}

	// Reward consistency: every 7 consecutive completions, grant +1 shield if shields are active (max 3)
	if result.NewStreak > 0 && result.NewStreak%7 == 0 && shieldActive && result.ShieldsRemaining < 3 {
		result.ShieldsRemaining += 1
	}

	return result
}

// ValidateStreakState checks if a habit's streak is broken or preserved by shields due to missed days.
func ValidateStreakState(currentStreak int, shieldActive bool, shieldsRemaining int, lastLogged time.Time, now time.Time) StreakResult {
	startOfToday := now.Truncate(24 * time.Hour)
	startOfYesterday := startOfToday.AddDate(0, 0, -1)

	result := StreakResult{
		NewStreak:        currentStreak,
		ShieldsRemaining: shieldsRemaining,
	}

	lastLogDay := lastLogged.Truncate(24 * time.Hour)
	if lastLogDay.Before(startOfYesterday) {
		// Calculate the number of missed days between the day after lastLogDay and yesterday
		daysMissed := int(startOfYesterday.Sub(lastLogDay).Hours() / 24)
		if daysMissed < 1 {
			daysMissed = 1
		}

		shieldsAvailable := 0
		if shieldActive && shieldsRemaining > 0 {
			shieldsAvailable = shieldsRemaining
		}

		shieldsUsed := intMin(shieldsAvailable, daysMissed)
		remainingMissed := daysMissed - shieldsUsed

		if remainingMissed > 0 {
			result.NewStreak = 0
			result.ShieldsRemaining = intMax(0, shieldsRemaining-shieldsUsed)
			result.ShieldsExhausted = true
			result.ShieldsUsed = shieldsUsed
		} else if shieldsUsed > 0 {
			result.ShieldsRemaining = shieldsRemaining - shieldsUsed
			result.ShieldActivated = true
			result.ShieldsUsed = shieldsUsed
		}
	}

	return result
}

func intMin(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func intMax(a, b int) int {
	if a > b {
		return a
	}
	return b
}
