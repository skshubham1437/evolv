package services

import (
	"errors"
	"testing"
)

func TestAIRateLimiter(t *testing.T) {
	// Setup custom rate limiter configs to test threshold easily
	aiLimiter.mu.Lock()
	// Clear existing buckets
	aiLimiter.buckets = make(map[uint]*aiUserBucket)
	// Set burst to 2, refill rate per hour to 3600 (1 token per second)
	aiLimiter.burst = 2
	aiLimiter.perHour = 3600.0 // ≈ 1 token per second
	aiLimiter.mu.Unlock()

	userID := uint(999)

	// First two calls should succeed
	err := CheckAILimit(userID)
	if err != nil {
		t.Fatalf("expected call 1 to succeed, got %v", err)
	}

	err = CheckAILimit(userID)
	if err != nil {
		t.Fatalf("expected call 2 to succeed, got %v", err)
	}

	// Third call should fail with rate limit error
	err = CheckAILimit(userID)
	if err == nil {
		t.Fatalf("expected call 3 to fail due to rate limit")
	}
	if !errors.Is(err, ErrAIRateLimited) {
		t.Fatalf("expected ErrAIRateLimited, got %v", err)
	}
}
