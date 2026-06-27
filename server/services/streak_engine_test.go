package services

import (
	"testing"
	"time"
)

func TestEvaluateCompletion(t *testing.T) {
	// Case 1: Logged yesterday -> streak increments, shields unchanged
	res := EvaluateCompletion(5, true, 1, true)
	if res.NewStreak != 6 {
		t.Errorf("expected streak 6, got %d", res.NewStreak)
	}
	if res.ShieldsRemaining != 1 {
		t.Errorf("expected shields 1, got %d", res.ShieldsRemaining)
	}
	if res.ShieldActivated {
		t.Errorf("expected shield not activated")
	}

	// Case 2: Missed yesterday but shield active -> streak increments, shield consumed
	res = EvaluateCompletion(5, true, 2, false)
	if res.NewStreak != 6 {
		t.Errorf("expected streak 6, got %d", res.NewStreak)
	}
	if res.ShieldsRemaining != 1 {
		t.Errorf("expected shields 1, got %d", res.ShieldsRemaining)
	}
	if !res.ShieldActivated {
		t.Errorf("expected shield activated")
	}

	// Case 3: Missed yesterday, shield inactive -> streak resets to 1
	res = EvaluateCompletion(5, false, 1, false)
	if res.NewStreak != 1 {
		t.Errorf("expected streak 1, got %d", res.NewStreak)
	}
	if res.ShieldsRemaining != 1 {
		t.Errorf("expected shields 1, got %d", res.ShieldsRemaining)
	}
	if res.ShieldActivated {
		t.Errorf("expected shield not activated")
	}

	// Case 4: Reward consistency -> streak reaches 7, gains a shield
	res = EvaluateCompletion(6, true, 1, true)
	if res.NewStreak != 7 {
		t.Errorf("expected streak 7, got %d", res.NewStreak)
	}
	if res.ShieldsRemaining != 2 {
		t.Errorf("expected shields 2, got %d", res.ShieldsRemaining)
	}

	// Case 5: Reward consistency capped -> streak reaches 7, shields remaining already max (3)
	res = EvaluateCompletion(6, true, 3, true)
	if res.NewStreak != 7 {
		t.Errorf("expected streak 7, got %d", res.NewStreak)
	}
	if res.ShieldsRemaining != 3 {
		t.Errorf("expected shields capped at 3, got %d", res.ShieldsRemaining)
	}
}

func TestValidateStreakState(t *testing.T) {
	now := time.Date(2026, 6, 28, 12, 0, 0, 0, time.UTC)
	lastLoggedYesterday := now.AddDate(0, 0, -1)
	lastLoggedTwoDaysAgo := now.AddDate(0, 0, -2)
	lastLoggedFiveDaysAgo := now.AddDate(0, 0, -5)

	// Case 1: Logged yesterday -> no streak change, no shield activation
	res := ValidateStreakState(10, true, 2, lastLoggedYesterday, now)
	if res.NewStreak != 10 {
		t.Errorf("expected streak 10, got %d", res.NewStreak)
	}
	if res.ShieldsRemaining != 2 {
		t.Errorf("expected shields 2, got %d", res.ShieldsRemaining)
	}
	if res.ShieldActivated || res.ShieldsExhausted {
		t.Errorf("expected no shield activity")
	}

	// Case 2: Missed one day (last logged two days ago), shield active -> preserved by shield
	res = ValidateStreakState(10, true, 2, lastLoggedTwoDaysAgo, now)
	if res.NewStreak != 10 {
		t.Errorf("expected streak 10, got %d", res.NewStreak)
	}
	if res.ShieldsRemaining != 1 {
		t.Errorf("expected shields 1, got %d", res.ShieldsRemaining)
	}
	if !res.ShieldActivated {
		t.Errorf("expected shield activated")
	}
	if res.ShieldsUsed != 1 {
		t.Errorf("expected 1 shield used, got %d", res.ShieldsUsed)
	}

	// Case 3: Missed 4 days, shield active but only 2 shields left -> streak broken, shields exhausted
	res = ValidateStreakState(10, true, 2, lastLoggedFiveDaysAgo, now)
	if res.NewStreak != 0 {
		t.Errorf("expected streak to reset to 0, got %d", res.NewStreak)
	}
	if res.ShieldsRemaining != 0 {
		t.Errorf("expected shields exhausted to 0, got %d", res.ShieldsRemaining)
	}
	if !res.ShieldsExhausted {
		t.Errorf("expected shields exhausted indicator to be true")
	}
	if res.ShieldsUsed != 2 {
		t.Errorf("expected 2 shields used, got %d", res.ShieldsUsed)
	}
}
