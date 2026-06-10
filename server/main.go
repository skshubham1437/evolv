package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"evolv-server/database"
	"evolv-server/middleware"
	"evolv-server/services"

	"github.com/joho/godotenv"
)

func main() {
	// Initialize slog default logger. JSON for production, readable text for local development.
	var slogHandler slog.Handler
	if os.Getenv("APP_ENV") == "production" || os.Getenv("APP_ENV") == "prod" {
		slogHandler = slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo})
	} else {
		slogHandler = slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug})
	}
	slog.SetDefault(slog.New(slogHandler))

	// Load .env file if exists
	_ = godotenv.Load()

	// ── Security: fail fast on weak JWT secret ────────────────────────
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		slog.Error("FATAL: JWT_SECRET environment variable is not set. Set it to a cryptographically random string of at least 32 characters. Example: openssl rand -hex 32")
		os.Exit(1)
	}
	if len(jwtSecret) < 32 {
		slog.Error("FATAL: JWT_SECRET is too short (minimum 32 characters). A weak secret allows token forgery attacks.")
		os.Exit(1)
	}

	// Initialize database connection
	database.Connect()

	// Apply pending SQL migrations (replaces GORM AutoMigrate).
	// Migrations are embedded into the binary via go:embed in database/migrate.go.
	// The server will exit if any migration fails.
	database.RunMigrations()

	// Init AI
	if err := services.InitAI(); err != nil {
		slog.Warn("AI initialization failed", "error", err)
	}

	// Setup Routers (auth required) ---
	protectedMux := http.NewServeMux()

	registerUserRoutes(protectedMux)
	registerDashboardRoutes(protectedMux)
	registerTaskRoutes(protectedMux)
	registerHabitRoutes(protectedMux)
	registerJournalRoutes(protectedMux)
	registerVisionRoutes(protectedMux)
	registerGoalRoutes(protectedMux)
	registerWeeklyRoutes(protectedMux)
	registerAnalyticsRoutes(protectedMux)
	registerQuarterlyRoutes(protectedMux)
	registerMonthlyRoutes(protectedMux)
	registerAIRoutes(protectedMux)
	registerProjectRoutes(protectedMux)
	registerNotificationRoutes(protectedMux)

	// --- Combine ---
	rootMux := http.NewServeMux()

	// Public routes (rate-limited)
	registerPublicRoutes(rootMux)

	// Protected routes (everything under /api/ except auth)
	rootMux.Handle("/api/", middleware.JWTAuth(protectedMux))

	// Prometheus metrics endpoint (publicly scrapable)
	rootMux.Handle("/metrics", middleware.MetricsHandler())

	// Wrap with MetricsMiddleware, RequestLogger, and CORS middleware
	handler := middleware.MetricsMiddleware(middleware.RequestLogger(corsMiddleware(rootMux)))

	// Start metrics collectors and background cleanup tasks
	middleware.StartDBMetricsCollection(30 * time.Second)
	startRateLimiterCleanup()

	port := "8081"
	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      handler,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 60 * time.Second, // 60s to allow long AI responses
		IdleTimeout:  120 * time.Second,
	}

	// Start server in background
	go func() {
		slog.Info("Evolv API running", "addr", "http://localhost:"+port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("Server failed to start", "error", err)
			os.Exit(1)
		}
	}()

	// Graceful shutdown on SIGTERM / SIGINT (e.g. docker stop, Ctrl+C).
	// Gives in-flight requests up to 30 seconds to complete.
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGTERM, syscall.SIGINT)
	<-quit
	slog.Info("Shutting down server — draining in-flight requests (max 30s)...")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		slog.Error("Graceful shutdown timed out", "error", err)
	}
	slog.Info("Server stopped cleanly")
}

// corsMiddleware allows requests from a configurable origin (ALLOWED_ORIGIN env var).
func corsMiddleware(next http.Handler) http.Handler {
	origin := os.Getenv("ALLOWED_ORIGIN")
	if origin == "" {
		origin = "http://localhost:5173"
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// --- Simple IP-based rate limiter for auth endpoints ---

type ipRateLimiter struct {
	mu       sync.Mutex
	visitors map[string]*visitor
}

type visitor struct {
	tokens   float64
	lastSeen time.Time
}

var authLimiter = &ipRateLimiter{visitors: make(map[string]*visitor)}

const (
	rateLimitBurst   = 10  // max burst
	rateLimitPerSec  = 2.0 // sustained rate
)

// RateLimitAuth wraps a handler with IP-based rate limiting.
// The cleanup goroutine is started exactly once via startRateLimiterCleanup().
func RateLimitAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ip := r.RemoteAddr

		authLimiter.mu.Lock()
		v, exists := authLimiter.visitors[ip]
		if !exists {
			v = &visitor{tokens: rateLimitBurst, lastSeen: time.Now()}
			authLimiter.visitors[ip] = v
		}

		// Refill tokens based on elapsed time
		elapsed := time.Since(v.lastSeen).Seconds()
		v.tokens += elapsed * rateLimitPerSec
		if v.tokens > rateLimitBurst {
			v.tokens = rateLimitBurst
		}
		v.lastSeen = time.Now()

		if v.tokens < 1 {
			authLimiter.mu.Unlock()
			http.Error(w, `{"error":"too many requests, please try again later"}`, http.StatusTooManyRequests)
			return
		}

		v.tokens--
		authLimiter.mu.Unlock()

		next.ServeHTTP(w, r)
	}
}

// startRateLimiterCleanup starts a single background goroutine that evicts
// stale IP entries from the rate limiter map every 5 minutes.
func startRateLimiterCleanup() {
	go func() {
		for {
			time.Sleep(5 * time.Minute)
			authLimiter.mu.Lock()
			for ip, v := range authLimiter.visitors {
				if time.Since(v.lastSeen) > 10*time.Minute {
					delete(authLimiter.visitors, ip)
				}
			}
			authLimiter.mu.Unlock()
		}
	}()
}
