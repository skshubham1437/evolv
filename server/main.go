package main

import (
	"fmt"
	"log"
	"net/http"

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

	// Public routes
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

// corsMiddleware allows requests from the React client
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}
