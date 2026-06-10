package middleware

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"log/slog"
	"net/http"
	"time"
)

type loggingContextKey string

const RequestIDKey loggingContextKey = "request_id"

// GetRequestID extracts the request ID from a request context.
func GetRequestID(ctx context.Context) string {
	id, _ := ctx.Value(RequestIDKey).(string)
	return id
}

// responseWriterWrapper wraps http.ResponseWriter to capture the status code.
type responseWriterWrapper struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriterWrapper) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

func (rw *responseWriterWrapper) Write(b []byte) (int, error) {
	return rw.ResponseWriter.Write(b)
}

// RequestLogger returns a middleware that logs incoming HTTP requests with structured logging (slog).
// It generates a unique request ID, injects it into the context, adds it to the response headers,
// and logs the request details and completion status.
func RequestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Get or generate request ID
		requestID := r.Header.Get("X-Request-ID")
		if requestID == "" {
			requestID = generateRequestID()
		}

		// Inject request ID into context
		ctx := context.WithValue(r.Context(), RequestIDKey, requestID)
		r = r.WithContext(ctx)

		// Set response header
		w.Header().Set("X-Request-ID", requestID)

		// Wrap response writer to capture status code
		wrapped := &responseWriterWrapper{
			ResponseWriter: w,
			statusCode:     http.StatusOK, // default status code is OK
		}

		// Process request
		next.ServeHTTP(wrapped, r)

		// Get user ID if present (from JWTAuth middleware)
		userID := GetUserID(r)

		// Log completed request details
		duration := time.Since(start)
		slog.InfoContext(ctx, "HTTP request completed",
			slog.String("request_id", requestID),
			slog.String("method", r.Method),
			slog.String("path", r.URL.Path),
			slog.Int("status", wrapped.statusCode),
			slog.Duration("duration", duration),
			slog.String("ip", r.RemoteAddr),
			slog.String("user_agent", r.UserAgent()),
			slog.Uint64("user_id", uint64(userID)),
		)
	})
}

// generateRequestID generates a random 16-byte hex string.
func generateRequestID() string {
	bytes := make([]byte, 16)
	if _, err := rand.Read(bytes); err != nil {
		return "unknown-request-id"
	}
	return hex.EncodeToString(bytes)
}
