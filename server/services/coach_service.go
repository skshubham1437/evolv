package services

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"evolv-server/database"
	"evolv-server/models"
)

type BurnoutInsight struct {
	Risk    string `json:"risk"`
	Details string `json:"details"`
}

// GetBurnoutRiskInsight aggregates user metrics, handles caching, and computes burnout risk via AI.
func GetBurnoutRiskInsight(ctx context.Context, userID uint) (BurnoutInsight, error) {
	// 1. Fetch journal entries from past 7 days
	sevenDaysAgo := time.Now().AddDate(0, 0, -7).Format("2006-01-02")
	var entries []models.JournalEntry
	if err := database.DB.Where("user_id = ? AND date >= ?", userID, sevenDaysAgo).Order("date asc").Find(&entries).Error; err != nil {
		return BurnoutInsight{}, fmt.Errorf("failed to fetch journal logs: %w", err)
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

	// 3. Look up from cache
	cacheKey := GenerateCacheKeyForBurnout(userID, moodHistory, energyHistory, completionRate)
	if cachedResponse, hit := GetCachedAIResponse(userID, "burnout_risk", cacheKey); hit {
		var cachedData BurnoutInsight
		if err := json.Unmarshal([]byte(cachedResponse), &cachedData); err == nil {
			return cachedData, nil
		}
	}

	// 4. Compute via Gemini AI service
	risk, details, err := CalculateBurnoutRisk(ctx, moodHistory, energyHistory, completionRate)
	if err != nil {
		return BurnoutInsight{}, fmt.Errorf("failed to calculate burnout risk: %w", err)
	}

	insight := BurnoutInsight{
		Risk:    risk,
		Details: details,
	}

	// 5. Save to cache (expires in 6 hours)
	if jsonBytes, err := json.Marshal(insight); err == nil {
		_ = SaveCachedAIResponse(userID, "burnout_risk", cacheKey, string(jsonBytes), 6*time.Hour)
	}

	return insight, nil
}

// GetMorningBriefInsight aggregates daily status, checks caching, and generates a morning brief via AI.
func GetMorningBriefInsight(ctx context.Context, userID uint) (string, error) {
	// 1. Fetch user details
	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		return "", fmt.Errorf("user not found: %w", err)
	}

	// 2. Fetch tasks and habits
	var tasks []models.Task
	var habits []models.Habit
	database.DB.Where("user_id = ? AND is_completed = ?", userID, false).Find(&tasks)
	database.DB.Where("user_id = ?", userID).Find(&habits)

	// 3. Look up from cache
	cacheKey := GenerateCacheKeyForBrief(userID, tasks, habits)
	if cachedBrief, hit := GetCachedAIResponse(userID, "morning_brief", cacheKey); hit {
		return cachedBrief, nil
	}

	// 4. Generate via Gemini AI service
	brief, err := GenerateMorningBrief(ctx, user.Name, tasks, habits)
	if err != nil {
		return "", fmt.Errorf("failed to generate morning brief: %w", err)
	}

	// 5. Save to cache (expires in 12 hours)
	_ = SaveCachedAIResponse(userID, "morning_brief", cacheKey, brief, 12*time.Hour)

	return brief, nil
}
