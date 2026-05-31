package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"sync"
	"time"

	"evolv-server/database"
	"evolv-server/middleware"
	"evolv-server/models"
	"evolv-server/services"

	"github.com/joho/godotenv"
)

func main() {
	// Load .env file if exists
	_ = godotenv.Load()

	// Initialize database connection
	database.Connect()

	// Auto-migrate models
	err := database.DB.AutoMigrate(
		&models.User{},
		&models.Task{},
		&models.Habit{},
		&models.HabitLog{},
		&models.JournalEntry{},
		&models.Vision{},
		&models.Goal{},
		&models.KeyResult{},
		&models.Milestone{},
		&models.FocusArea{},
		&models.BucketListItem{},
		&models.WeeklyPlan{},
		&models.TimeBlock{},
		&models.QuarterlyObjective{},
		&models.MonthlyPlan{},
		&models.Project{},
	)
	if err != nil {
		log.Fatal("Failed to auto-migrate database:", err)
	}
	log.Println("Database migration complete")

	// Init AI
	if err := services.InitAI(); err != nil {
		log.Println("Warning: AI initialization failed:", err)
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

	// --- Combine ---
	rootMux := http.NewServeMux()

	// Public routes (rate-limited)
	registerPublicRoutes(rootMux)

	// Protected routes (everything under /api/ except auth)
	rootMux.Handle("/api/", middleware.JWTAuth(protectedMux))

	// Wrap with CORS middleware
	handler := corsMiddleware(rootMux)

	port := "8081"
	fmt.Printf("🚀 Evolv API running on http://localhost:%s\n", port)
	if err := http.ListenAndServe(":"+port, handler); err != nil {
		log.Fatal(err)
	}
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
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
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
func RateLimitAuth(next http.HandlerFunc) http.HandlerFunc {
	// Background cleanup of stale visitors every 5 minutes
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
