package services

import (
	"errors"
	"fmt"
	"sync"
	"time"
)

// ErrAIRateLimited is returned when a user has exceeded their AI call quota.
var ErrAIRateLimited = errors.New("AI rate limit exceeded — please wait before making another request")

// aiUserBucket is a per-user token bucket for AI calls.
type aiUserBucket struct {
	tokens   float64
	lastSeen time.Time
}

// aiRateLimiter manages per-user token buckets for AI endpoint throttling.
type aiRateLimiter struct {
	mu      sync.Mutex
	buckets map[uint]*aiUserBucket

	// Configuration
	burst   float64 // max tokens (burst capacity)
	perHour float64 // sustained token replenishment rate per hour
}

var aiLimiter = &aiRateLimiter{
	buckets: make(map[uint]*aiUserBucket),
	burst:   20,   // max 20 AI calls at once
	perHour: 20.0, // replenish 20 tokens per hour (≈ 1 every 3 minutes)
}

func init() {
	// Evict stale buckets every 10 minutes.
	go func() {
		for {
			time.Sleep(10 * time.Minute)
			aiLimiter.mu.Lock()
			for uid, b := range aiLimiter.buckets {
				if time.Since(b.lastSeen) > 2*time.Hour {
					delete(aiLimiter.buckets, uid)
				}
			}
			aiLimiter.mu.Unlock()
		}
	}()
}

// CheckAILimit returns nil if the user is within their quota, or
// ErrAIRateLimited with the approximate wait time embedded in the message.
func CheckAILimit(userID uint) error {
	aiLimiter.mu.Lock()
	defer aiLimiter.mu.Unlock()

	b, exists := aiLimiter.buckets[userID]
	if !exists {
		b = &aiUserBucket{tokens: aiLimiter.burst, lastSeen: time.Now()}
		aiLimiter.buckets[userID] = b
	}

	// Refill tokens based on elapsed time.
	elapsed := time.Since(b.lastSeen).Hours()
	b.tokens += elapsed * aiLimiter.perHour
	if b.tokens > aiLimiter.burst {
		b.tokens = aiLimiter.burst
	}
	b.lastSeen = time.Now()

	if b.tokens < 1 {
		waitSeconds := (1 - b.tokens) / (aiLimiter.perHour / 3600)
		return fmt.Errorf("%w (retry in %.0fs)", ErrAIRateLimited, waitSeconds)
	}

	b.tokens--
	return nil
}
