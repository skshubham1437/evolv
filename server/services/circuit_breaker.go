package services

import (
	"errors"
	"fmt"
	"sync"
	"time"
)

// ErrCircuitOpen is returned when the circuit breaker is open and rejecting calls.
var ErrCircuitOpen = errors.New("AI service temporarily unavailable (circuit open)")

// cbState represents the circuit breaker's current state.
type cbState int

const (
	cbClosed   cbState = iota // normal operation — requests pass through
	cbOpen                    // fault detected — requests are rejected immediately
	cbHalfOpen                // cooldown elapsed — one probe request is allowed
)

// CircuitBreaker is a thread-safe three-state circuit breaker.
//
//	Closed  → too many failures → Open
//	Open    → cooldown elapsed  → HalfOpen
//	HalfOpen → success          → Closed
//	HalfOpen → failure          → Open (reset cooldown)
type CircuitBreaker struct {
	mu sync.Mutex

	state       cbState
	failures    int
	lastFailure time.Time

	// Configuration
	maxFailures int           // consecutive failures before opening
	cooldown    time.Duration // how long to wait before trying again
}

// NewCircuitBreaker creates a circuit breaker that opens after maxFailures
// consecutive errors and attempts recovery after cooldown.
func NewCircuitBreaker(maxFailures int, cooldown time.Duration) *CircuitBreaker {
	return &CircuitBreaker{
		state:       cbClosed,
		maxFailures: maxFailures,
		cooldown:    cooldown,
	}
}

// Do executes fn if the circuit is closed or half-open.
// Returns ErrCircuitOpen immediately if the circuit is open.
func (cb *CircuitBreaker) Do(fn func() error) error {
	cb.mu.Lock()
	switch cb.state {
	case cbOpen:
		if time.Since(cb.lastFailure) < cb.cooldown {
			cb.mu.Unlock()
			return ErrCircuitOpen
		}
		// Cooldown elapsed → probe with one request
		cb.state = cbHalfOpen
	case cbHalfOpen:
		// Only one concurrent probe is allowed; subsequent callers are rejected.
		cb.mu.Unlock()
		return ErrCircuitOpen
	}
	cb.mu.Unlock()

	// Execute the function outside the lock to avoid deadlock.
	err := fn()

	cb.mu.Lock()
	defer cb.mu.Unlock()

	if err != nil {
		cb.failures++
		cb.lastFailure = time.Now()
		if cb.state == cbHalfOpen || cb.failures >= cb.maxFailures {
			cb.state = cbOpen
		}
		return err
	}

	// Success — reset
	cb.state = cbClosed
	cb.failures = 0
	return nil
}

// State returns a human-readable label for the current breaker state.
func (cb *CircuitBreaker) State() string {
	cb.mu.Lock()
	defer cb.mu.Unlock()
	switch cb.state {
	case cbOpen:
		return fmt.Sprintf("open (resets in %.0fs)", cb.cooldown.Seconds()-time.Since(cb.lastFailure).Seconds())
	case cbHalfOpen:
		return "half-open"
	default:
		return "closed"
	}
}

// IsOpen returns true if the circuit is open and the cooldown has not yet elapsed.
func (cb *CircuitBreaker) IsOpen() bool {
	cb.mu.Lock()
	defer cb.mu.Unlock()
	return cb.state == cbOpen && time.Since(cb.lastFailure) < cb.cooldown
}

