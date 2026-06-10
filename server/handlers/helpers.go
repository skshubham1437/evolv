package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"evolv-server/middleware"
	"evolv-server/models"
	"gorm.io/gorm"
)

// HabitWithStatus extends models.Habit with a computed field indicating
// whether the habit was completed today. Used across multiple handlers.
type HabitWithStatus struct {
	models.Habit
	CompletedToday bool `json:"completed_today"`
}

// respond writes a JSON-encoded response with the appropriate content-type header.
func respond(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

// getUserIDFromCtx extracts the authenticated user ID from the request context.
// Panics if no user ID is present (which should never happen behind JWTAuth middleware).
func getUserIDFromCtx(r *http.Request) uint {
	userID := middleware.GetUserID(r)
	if userID == 0 {
		panic("unauthenticated request: user ID missing from context")
	}
	return userID
}

// parseDateString parses a flexible string representation of a date into a *time.Time.
// It supports empty strings, "Ongoing", YYYY-MM-DD, and RFC3339 formats.
func parseDateString(s string) (*time.Time, error) {
	if s == "" || s == "Ongoing" || s == "null" {
		return nil, nil
	}
	// Try YYYY-MM-DD
	t, err := time.Parse("2006-01-02", s)
	if err == nil {
		return &t, nil
	}
	// Try RFC3339
	t, err = time.Parse(time.RFC3339, s)
	if err == nil {
		return &t, nil
	}
	return nil, err
}

// UpdateGoalProgress calculates the progress of a Goal based on its associated Key Results and Tasks.
func UpdateGoalProgress(tx *gorm.DB, goalID uint) error {
	var krs []models.KeyResult
	if err := tx.Where("goal_id = ?", goalID).Find(&krs).Error; err != nil {
		return err
	}
	var tasks []models.Task
	if err := tx.Where("goal_id = ? AND deleted_at IS NULL", goalID).Find(&tasks).Error; err != nil {
		return err
	}

	totalItems := len(krs) + len(tasks)
	if totalItems == 0 {
		return tx.Model(&models.Goal{}).Where("id = ?", goalID).Update("progress", 0).Error
	}

	doneItems := 0
	for _, kr := range krs {
		if kr.IsDone {
			doneItems++
		}
	}
	for _, t := range tasks {
		if t.IsCompleted {
			doneItems++
		}
	}

	progress := (doneItems * 100) / totalItems
	return tx.Model(&models.Goal{}).Where("id = ?", goalID).Update("progress", progress).Error
}
