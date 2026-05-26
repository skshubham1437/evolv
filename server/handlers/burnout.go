package handlers

import (
	"net/http"
	"time"

	"evolv-server/database"
	"evolv-server/models"
	"evolv-server/services"
)

// GetBurnoutRisk handles GET /api/ai/burnout-risk
func GetBurnoutRisk(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)

	// 1. Fetch journal entries from past 7 days
	sevenDaysAgo := time.Now().AddDate(0, 0, -7).Format("2006-01-02")
	var entries []models.JournalEntry
	if err := database.DB.Where("user_id = ? AND date >= ?", userID, sevenDaysAgo).Order("date asc").Find(&entries).Error; err != nil {
		http.Error(w, `{"error":"failed to fetch journal logs"}`, http.StatusInternalServerError)
		return
	}

	var moodHistory []int
	var energyHistory []int
	for _, entry := range entries {
		moodHistory = append(moodHistory, entry.Mood)
		energyHistory = append(energyHistory, entry.Energy)
	}

	// 2. Compute completion rate
	var doneTasks int64
	var pendingTasks int64
	database.DB.Model(&models.Task{}).Where("user_id = ? AND is_completed = true AND updated_at >= ?", userID, time.Now().AddDate(0, 0, -7)).Count(&doneTasks)
	database.DB.Model(&models.Task{}).Where("user_id = ? AND is_completed = false", userID).Count(&pendingTasks)
	totalTasks := doneTasks + pendingTasks

	var doneHabits int64
	database.DB.Table("habit_logs").Joins("join habits on habits.id = habit_logs.habit_id").Where("habits.user_id = ? AND habit_logs.completed_at >= ?", userID, time.Now().AddDate(0, 0, -7)).Count(&doneHabits)

	var totalHabits int64
	database.DB.Model(&models.Habit{}).Where("user_id = ?", userID).Count(&totalHabits)
	habitExpectation := totalHabits * 7

	var completionRate float64 = 100.0
	denominator := totalTasks + habitExpectation
	if denominator > 0 {
		completionRate = float64(doneTasks+doneHabits) / float64(denominator) * 100.0
	}

	// 3. Call AI service to evaluate risk
	risk, details, err := services.CalculateBurnoutRisk(r.Context(), moodHistory, energyHistory, completionRate)
	if err != nil {
		http.Error(w, `{"error":"failed to calculate risk"}`, http.StatusInternalServerError)
		return
	}

	respond(w, map[string]string{
		"risk":    risk,
		"details": details,
	})
}
