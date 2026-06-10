package services

import (
	"errors"
	"testing"
	"time"
)

func TestCircuitBreaker(t *testing.T) {
	// 1. Create a circuit breaker with 3 failures and 100ms cooldown
	cb := NewCircuitBreaker(3, 100*time.Millisecond)

	dummyErr := errors.New("dummy error")

	// Initially closed, calls should pass through
	for i := 0; i < 2; i++ {
		err := cb.Do(func() error { return nil })
		if err != nil {
			t.Fatalf("expected nil error, got %v", err)
		}
	}

	// 2 failures, should still be closed
	for i := 0; i < 2; i++ {
		err := cb.Do(func() error { return dummyErr })
		if !errors.Is(err, dummyErr) {
			t.Fatalf("expected dummyErr, got %v", err)
		}
	}

	// State should be closed
	if cb.State() != "closed" {
		t.Fatalf("expected state 'closed', got %s", cb.State())
	}
	if cb.IsOpen() {
		t.Fatalf("expected IsOpen to be false")
	}

	// 3rd failure: should open
	err := cb.Do(func() error { return dummyErr })
	if !errors.Is(err, dummyErr) {
		t.Fatalf("expected dummyErr, got %v", err)
	}

	if cb.IsOpen() == false {
		t.Fatalf("expected IsOpen to be true after 3 consecutive failures")
	}

	// Next call should fail immediately with ErrCircuitOpen
	err = cb.Do(func() error { return nil })
	if !errors.Is(err, ErrCircuitOpen) {
		t.Fatalf("expected ErrCircuitOpen, got %v", err)
	}

	// Wait for cooldown
	time.Sleep(150 * time.Millisecond)

	// Circuit should be half-open (IsOpen returns false since cooldown has elapsed)
	if cb.IsOpen() {
		t.Fatalf("expected IsOpen to be false after cooldown elapsed")
	}

	// Probe success should close the circuit
	err = cb.Do(func() error { return nil })
	if err != nil {
		t.Fatalf("expected success in half-open state, got %v", err)
	}

	if cb.State() != "closed" {
		t.Fatalf("expected state 'closed' after successful probe, got %s", cb.State())
	}

	// Fail again 3 times to open it
	for i := 0; i < 3; i++ {
		_ = cb.Do(func() error { return dummyErr })
	}
	if !cb.IsOpen() {
		t.Fatalf("expected circuit to open again")
	}

	// Wait for cooldown
	time.Sleep(150 * time.Millisecond)

	// Probe failure should trip circuit open again immediately
	err = cb.Do(func() error { return dummyErr })
	if !errors.Is(err, dummyErr) {
		t.Fatalf("expected dummyErr, got %v", err)
	}

	if !cb.IsOpen() {
		t.Fatalf("expected circuit to return to open state immediately after half-open failure")
	}
}
