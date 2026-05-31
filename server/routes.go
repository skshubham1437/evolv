package main

import (
	"net/http"

	"evolv-server/handlers"
)

func registerUserRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/me", handlers.GetMe)
	mux.HandleFunc("PATCH /api/me", handlers.UpdateMe)
}

func registerDashboardRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/daily", handlers.GetDailyDashboard)
}

func registerTaskRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/tasks", handlers.GetTasks)
	mux.HandleFunc("POST /api/tasks", handlers.CreateTask)
	mux.HandleFunc("PATCH /api/tasks/{id}", handlers.UpdateTask)
	mux.HandleFunc("PUT /api/tasks/{id}/complete", handlers.CompleteTask)
	mux.HandleFunc("DELETE /api/tasks/{id}", handlers.DeleteTask)
	mux.HandleFunc("POST /api/tasks/reschedule", handlers.RescheduleOverdue)
}

func registerHabitRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/habits", handlers.GetHabits)
	mux.HandleFunc("POST /api/habits", handlers.CreateHabit)
	mux.HandleFunc("PATCH /api/habits/{id}", handlers.UpdateHabit)
	mux.HandleFunc("POST /api/habits/{id}/log", handlers.LogHabit)
	mux.HandleFunc("DELETE /api/habits/{id}", handlers.DeleteHabit)
	mux.HandleFunc("GET /api/habits/{id}/stats", handlers.GetHabitStats)
	mux.HandleFunc("GET /api/habits/heatmap", handlers.GetHabitsHeatmap)
	mux.HandleFunc("GET /api/routines/{type}", handlers.GetRoutines)
}

func registerJournalRoutes(mux *http.ServeMux) {
	mux.HandleFunc("POST /api/journal", handlers.CreateJournalEntry)
	mux.HandleFunc("GET /api/journal", handlers.ListJournalEntries)
	mux.HandleFunc("GET /api/journal/{date}", handlers.GetJournalByDate)
	mux.HandleFunc("PATCH /api/journal/{id}", handlers.UpdateJournalEntry)
}

func registerVisionRoutes(mux *http.ServeMux) {
	mux.HandleFunc("POST /api/onboarding/complete", handlers.CompleteOnboarding)
	mux.HandleFunc("GET /api/vision", handlers.GetVision)
	mux.HandleFunc("PATCH /api/vision", handlers.UpdateVision)
	mux.HandleFunc("GET /api/vision/focus-areas", handlers.GetFocusAreas)
	mux.HandleFunc("PATCH /api/vision/focus-areas/{id}", handlers.UpdateFocusArea)
	mux.HandleFunc("GET /api/vision/bucket-list", handlers.GetBucketListItems)
	mux.HandleFunc("POST /api/vision/bucket-list", handlers.CreateBucketListItem)
	mux.HandleFunc("PATCH /api/vision/bucket-list/{id}/toggle", handlers.ToggleBucketListItem)
	mux.HandleFunc("DELETE /api/vision/bucket-list/{id}", handlers.DeleteBucketListItem)
}

func registerGoalRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/goals", handlers.GetGoals)
	mux.HandleFunc("POST /api/goals", handlers.CreateGoal)
	mux.HandleFunc("PATCH /api/goals/{id}", handlers.UpdateGoal)
	mux.HandleFunc("DELETE /api/goals/{id}", handlers.DeleteGoal)
	mux.HandleFunc("PATCH /api/goals/{goalID}/key-results/{krID}/toggle", handlers.ToggleKeyResult)
	mux.HandleFunc("POST /api/goals/{goalID}/key-results", handlers.CreateKeyResult)

	// Milestones
	mux.HandleFunc("GET /api/goals/{goalID}/milestones", handlers.GetMilestones)
	mux.HandleFunc("POST /api/goals/{goalID}/milestones", handlers.CreateMilestone)
	mux.HandleFunc("PATCH /api/goals/{goalID}/milestones/{milestoneID}", handlers.UpdateMilestone)
	mux.HandleFunc("DELETE /api/goals/{goalID}/milestones/{milestoneID}", handlers.DeleteMilestone)
}

func registerWeeklyRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/weekly/overview", handlers.GetWeeklyOverview)
	mux.HandleFunc("PUT /api/weekly/plan", handlers.UpsertWeeklyPlan)
	mux.HandleFunc("GET /api/weekly/time-blocks", handlers.GetTimeBlocks)
	mux.HandleFunc("POST /api/weekly/time-blocks", handlers.CreateTimeBlock)
	mux.HandleFunc("PATCH /api/weekly/time-blocks/{id}", handlers.UpdateTimeBlock)
	mux.HandleFunc("DELETE /api/weekly/time-blocks/{id}", handlers.DeleteTimeBlock)
}

func registerAnalyticsRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/analytics", handlers.GetAnalyticsSummary)
}

func registerQuarterlyRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/quarterly/{year}/{quarter}/scorecard", handlers.GetQuarterlyScorecard)
	mux.HandleFunc("POST /api/quarterly", handlers.CreateQuarterlyObjective)
	mux.HandleFunc("PATCH /api/quarterly/{id}", handlers.UpdateQuarterlyObjective)
	mux.HandleFunc("DELETE /api/quarterly/{id}", handlers.DeleteQuarterlyObjective)
}

func registerMonthlyRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/monthly/{year}/{month}", handlers.GetMonthlyPlan)
	mux.HandleFunc("PUT /api/monthly", handlers.UpsertMonthlyPlan)
}

func registerAIRoutes(mux *http.ServeMux) {
	mux.HandleFunc("POST /api/ai/chat", handlers.AIChat)
	mux.HandleFunc("POST /api/ai/break-down-goal", handlers.BreakDownGoalHandler)
	mux.HandleFunc("GET /api/ai/morning-brief", handlers.GetMorningBrief)
	mux.HandleFunc("GET /api/ai/insights", handlers.GetAIInsights)
	mux.HandleFunc("GET /api/ai/burnout-risk", handlers.GetBurnoutRisk)
	mux.HandleFunc("POST /api/ai/weekly-review", handlers.GenerateWeeklyReviewHandler)
	mux.HandleFunc("POST /api/ai/monthly-review", handlers.GenerateMonthlyReviewHandler)
}

func registerPublicRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok","app":"evolv"}`))
	})
	mux.HandleFunc("POST /api/auth/register", RateLimitAuth(handlers.Register))
	mux.HandleFunc("POST /api/auth/login", RateLimitAuth(handlers.Login))
}

func registerProjectRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/projects", handlers.GetProjects)
	mux.HandleFunc("POST /api/projects", handlers.CreateProject)
	mux.HandleFunc("PATCH /api/projects/{id}", handlers.UpdateProject)
	mux.HandleFunc("DELETE /api/projects/{id}", handlers.DeleteProject)
}
