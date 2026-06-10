package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"

	"evolv-server/database"
	"evolv-server/models"
	"evolv-server/services"
)

func handleAIError(w http.ResponseWriter, err error, defaultMsg string) {
	if errors.Is(err, services.ErrCircuitOpen) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusServiceUnavailable)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}
	if errors.Is(err, services.ErrAIRateLimited) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusTooManyRequests)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusInternalServerError)
	json.NewEncoder(w).Encode(map[string]string{"error": defaultMsg})
}

// ── POST /api/ai/chat ────────────────────────────────────────────────────────
func AIChat(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		Message string `json:"message"`
		Context string `json:"context"` // Optional context to append
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, `{"error":"Invalid payload"}`, http.StatusBadRequest)
		return
	}

	prompt := payload.Message
	if payload.Context != "" {
		prompt = "Context: " + payload.Context + "\n\nUser Message: " + payload.Message
	}

	response, err := services.GenerateChatResponse(r.Context(), prompt)
	if err != nil {
		handleAIError(w, err, "Failed to generate AI response")
		return
	}

	respond(w, map[string]string{"reply": response})
}

// ── POST /api/ai/break-down-goal ─────────────────────────────────────────────
func BreakDownGoalHandler(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)

	var payload struct {
		GoalID uint `json:"goal_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, `{"error":"Invalid payload"}`, http.StatusBadRequest)
		return
	}

	// Fetch goal
	var goal models.Goal
	if err := database.DB.Where("id = ? AND user_id = ?", payload.GoalID, userID).First(&goal).Error; err != nil {
		http.Error(w, `{"error":"Goal not found"}`, http.StatusNotFound)
		return
	}

	subtasks, err := services.BreakDownGoal(r.Context(), goal.Title, goal.Description)
	if err != nil {
		handleAIError(w, err, "Failed to break down goal")
		return
	}

	respond(w, subtasks)
}

// ── GET /api/ai/morning-brief ────────────────────────────────────────────────
func GetMorningBrief(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)

	// Fetch user details
	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		http.Error(w, `{"error":"User not found"}`, http.StatusNotFound)
		return
	}

	// Fetch tasks and habits
	var tasks []models.Task
	var habits []models.Habit
	database.DB.Where("user_id = ? AND is_completed = ?", userID, false).Find(&tasks)
	database.DB.Where("user_id = ?", userID).Find(&habits)

	brief, err := services.GenerateMorningBrief(r.Context(), user.Name, tasks, habits)
	if err != nil {
		handleAIError(w, err, "Failed to generate morning brief")
		return
	}

	respond(w, map[string]string{"brief": brief})
}

// ── GET /api/ai/insights ─────────────────────────────────────────────────────
func GetAIInsights(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)

	// Fetch goals, tasks, habits
	var goals []models.Goal
	var tasks []models.Task
	var habits []models.Habit
	database.DB.Where("user_id = ?", userID).Find(&goals)
	database.DB.Where("user_id = ? AND is_completed = ?", userID, false).Find(&tasks)
	database.DB.Where("user_id = ?", userID).Find(&habits)

	insights, err := services.GenerateProductivityInsights(r.Context(), goals, tasks, habits)
	if err != nil {
		handleAIError(w, err, "Failed to generate insights")
		return
	}

	respond(w, insights)
}

// ── POST /api/ai/weekly-review ───────────────────────────────────────────────
func GenerateWeeklyReviewHandler(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)

	var payload struct {
		Date string `json:"date"` // YYYY-MM-DD
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, `{"error":"Invalid payload"}`, http.StatusBadRequest)
		return
	}

	date := parseDate(payload.Date)
	year, weekNum := isoWeek(date)
	mondayStr, sundayStr := weekBounds(date)

	// Fetch or create WeeklyPlan
	var plan models.WeeklyPlan
	if err := database.DB.Where("user_id = ? AND year = ? AND week_number = ?", userID, year, weekNum).First(&plan).Error; err != nil {
		plan = models.WeeklyPlan{
			UserID:     userID,
			Year:       year,
			WeekNumber: weekNum,
			Theme:      "Weekly Focus",
		}
		if err := database.DB.Create(&plan).Error; err != nil {
			http.Error(w, `{"error":"Failed to create weekly plan"}`, http.StatusInternalServerError)
			return
		}
	}

	// Fetch tasks completed or pending for this week
	var tasks []models.Task
	database.DB.Where("user_id = ? AND due_date >= ? AND due_date <= ?", userID, mondayStr, sundayStr).Find(&tasks)

	// Fetch all habits of the user
	var habits []models.Habit
	database.DB.Where("user_id = ?", userID).Find(&habits)

	// Fetch journal entries written in this week
	var journals []models.JournalEntry
	database.DB.Where("user_id = ? AND date >= ? AND date <= ?", userID, mondayStr, sundayStr).Order("date asc").Find(&journals)

	// Week score
	weekScore := computeWeekScore(userID, mondayStr, sundayStr)

	// Generate review summary
	summary, err := services.GenerateWeeklyReview(r.Context(), plan, weekScore, tasks, habits, journals)
	if err != nil {
		handleAIError(w, err, "Failed to generate AI weekly review")
		return
	}

	// Save to DB
	plan.ReviewSummary = summary
	database.DB.Save(&plan)

	respond(w, plan)
}

// ── POST /api/ai/monthly-review ───────────────────────────────────────────────
func GenerateMonthlyReviewHandler(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)

	var payload struct {
		Year  int `json:"year"`
		Month int `json:"month"` // 1-12
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, `{"error":"Invalid payload"}`, http.StatusBadRequest)
		return
	}

	if payload.Year == 0 || payload.Month == 0 {
		http.Error(w, `{"error":"year and month are required"}`, http.StatusBadRequest)
		return
	}

	// Fetch or create MonthlyPlan
	var plan models.MonthlyPlan
	if err := database.DB.Where("user_id = ? AND year = ? AND month = ?", userID, payload.Year, payload.Month).First(&plan).Error; err != nil {
		plan = models.MonthlyPlan{
			UserID:     userID,
			Year:       payload.Year,
			Month:      payload.Month,
			Theme:      "Monthly Alignment",
			Goals:      "[]",
			LifeScores: "{}",
		}
		if err := database.DB.Create(&plan).Error; err != nil {
			http.Error(w, `{"error":"Failed to create monthly plan"}`, http.StatusInternalServerError)
			return
		}
	}

	// Query targeted goals
	var goalIDs []uint
	_ = json.Unmarshal([]byte(plan.Goals), &goalIDs)

	var goals []models.Goal
	if len(goalIDs) > 0 {
		database.DB.Where("user_id = ? AND id IN ?", userID, goalIDs).Find(&goals)
	}

	// Query journal entries for this month
	monthPrefix := fmt.Sprintf("%04d-%02d-%%", payload.Year, payload.Month)
	var journals []models.JournalEntry
	database.DB.Where("user_id = ? AND date LIKE ?", userID, monthPrefix).Order("date asc").Find(&journals)

	// Generate review summary
	summary, err := services.GenerateMonthlyReview(r.Context(), plan, goals, journals)
	if err != nil {
		handleAIError(w, err, "Failed to generate AI monthly review")
		return
	}

	// Save to DB
	plan.ReviewSummary = summary
	database.DB.Save(&plan)

	respond(w, plan)
}
