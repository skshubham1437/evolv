package handlers

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"evolv-server/middleware"
)

func TestAIChatRateLimiting(t *testing.T) {
	// Call AIChat multiple times to trigger rate limit.
	// Since we set up a new user, we need to exhaust their burst limit of 20 tokens.
	userID := uint(12345)

	// We make 21 requests. The first 20 should succeed or fail with uninitialized client (500 status code).
	// The 21st should fail with a 429 Too Many Requests status code.
	for i := 1; i <= 25; i++ {
		req := httptest.NewRequest(http.MethodPost, "/api/ai/chat", strings.NewReader(`{"message":"Hello"}`))
		req.Header.Set("Content-Type", "application/json")
		ctx := context.WithValue(req.Context(), middleware.UserIDKey, userID)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		AIChat(rr, req)

		if i <= 20 {
			// Expected to either return 500 (since aiClient is nil) or 200 (if initialized).
			// But it should NOT be 429.
			if rr.Code == http.StatusTooManyRequests {
				t.Fatalf("Request %d got rate limited prematurely", i)
			}
		} else {
			// Request 21+ must be rate limited (429 status code)
			if rr.Code != http.StatusTooManyRequests {
				t.Fatalf("Request %d got status %d, expected 429 Too Many Requests", i, rr.Code)
			}
		}
	}
}
