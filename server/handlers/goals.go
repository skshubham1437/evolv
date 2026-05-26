package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"evolv-server/database"
	"evolv-server/models"
)

// GetGoals handles GET /api/goals
func GetGoals(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)

	var goals []models.Goal
	if err := database.DB.Where("user_id = ?", userID).Preload("KeyResults").Order("created_at desc").Find(&goals).Error; err != nil {
		http.Error(w, `{"error":"Failed to fetch goals"}`, http.StatusInternalServerError)
		return
	}

	respond(w, goals)
}

// CreateGoal handles POST /api/goals
func CreateGoal(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)

	var payload struct {
		Title       string   `json:"title"`
		Description string   `json:"description"`
		Priority    string   `json:"priority"`
		DueDate     string   `json:"due_date"`
		KeyResults  []string `json:"key_results"`
	}

	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, `{"error":"Invalid request payload"}`, http.StatusBadRequest)
		return
	}

	if payload.Title == "" {
		http.Error(w, `{"error":"Title is required"}`, http.StatusBadRequest)
		return
	}

	var krs []models.KeyResult
	for _, krText := range payload.KeyResults {
		if krText != "" {
			krs = append(krs, models.KeyResult{
				Text:   krText,
				IsDone: false,
			})
		}
	}

	goal := models.Goal{
		UserID:      userID,
		Title:       payload.Title,
		Description: payload.Description,
		Priority:    payload.Priority,
		DueDate:     payload.DueDate,
		Progress:    0,
		Status:      "active",
		KeyResults:  krs,
	}

	if err := database.DB.Create(&goal).Error; err != nil {
		http.Error(w, `{"error":"Failed to create goal"}`, http.StatusInternalServerError)
		return
	}

	respond(w, goal)
}

// UpdateGoal handles PATCH /api/goals/{id}
func UpdateGoal(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	goalID := r.PathValue("id")

	var goal models.Goal
	if err := database.DB.Where("id = ? AND user_id = ?", goalID, userID).First(&goal).Error; err != nil {
		http.Error(w, `{"error":"Goal not found"}`, http.StatusNotFound)
		return
	}

	var payload struct {
		Title       *string `json:"title"`
		Description *string `json:"description"`
		Priority    *string `json:"priority"`
		DueDate     *string `json:"due_date"`
		Status      *string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, `{"error":"Invalid payload"}`, http.StatusBadRequest)
		return
	}

	if payload.Title != nil {
		goal.Title = *payload.Title
	}
	if payload.Description != nil {
		goal.Description = *payload.Description
	}
	if payload.Priority != nil {
		goal.Priority = *payload.Priority
	}
	if payload.DueDate != nil {
		goal.DueDate = *payload.DueDate
	}
	if payload.Status != nil {
		goal.Status = *payload.Status
	}

	database.DB.Save(&goal)

	respond(w, goal)
}

// DeleteGoal handles DELETE /api/goals/{id}
func DeleteGoal(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	goalID := r.PathValue("id")

	// Delete key results first (or rely on cascading, but explicit is safer here)
	database.DB.Where("goal_id = ?", goalID).Delete(&models.KeyResult{})
	
	if err := database.DB.Where("id = ? AND user_id = ?", goalID, userID).Delete(&models.Goal{}).Error; err != nil {
		http.Error(w, `{"error":"Failed to delete goal"}`, http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// ToggleKeyResult handles PATCH /api/goals/{goalID}/key-results/{krID}/toggle
func ToggleKeyResult(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	goalID := r.PathValue("goalID")
	krID := r.PathValue("krID")

	// First verify the goal belongs to the user
	var goal models.Goal
	if err := database.DB.Where("id = ? AND user_id = ?", goalID, userID).Preload("KeyResults").First(&goal).Error; err != nil {
		http.Error(w, `{"error":"Goal not found"}`, http.StatusNotFound)
		return
	}

	// Find the KR and toggle it
	found := false
	for i, kr := range goal.KeyResults {
		if krID == fmt.Sprint(kr.ID) { // Convert uint to string for comparison
			goal.KeyResults[i].IsDone = !goal.KeyResults[i].IsDone
			database.DB.Save(&goal.KeyResults[i])
			found = true
			break
		}
	}

	if !found {
		http.Error(w, `{"error":"Key result not found"}`, http.StatusNotFound)
		return
	}

	// Recalculate progress
	doneCount := 0
	for _, kr := range goal.KeyResults {
		if kr.IsDone {
			doneCount++
		}
	}
	
	newProgress := 0
	if len(goal.KeyResults) > 0 {
		newProgress = (doneCount * 100) / len(goal.KeyResults)
	}
	
	goal.Progress = newProgress
	database.DB.Save(&goal)

	respond(w, goal)
}

// CreateKeyResult handles POST /api/goals/{goalID}/key-results
func CreateKeyResult(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	goalID := r.PathValue("goalID")

	// First verify the goal belongs to the user
	var goal models.Goal
	if err := database.DB.Where("id = ? AND user_id = ?", goalID, userID).Preload("KeyResults").First(&goal).Error; err != nil {
		http.Error(w, `{"error":"Goal not found"}`, http.StatusNotFound)
		return
	}

	var payload struct {
		Text string `json:"text"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, `{"error":"Invalid payload"}`, http.StatusBadRequest)
		return
	}
	if payload.Text == "" {
		http.Error(w, `{"error":"Text is required"}`, http.StatusBadRequest)
		return
	}

	kr := models.KeyResult{
		GoalID: goal.ID,
		Text:   payload.Text,
		IsDone: false,
	}

	if err := database.DB.Create(&kr).Error; err != nil {
		http.Error(w, `{"error":"Failed to create key result"}`, http.StatusInternalServerError)
		return
	}

	// Recalculate goal progress
	var allKRs []models.KeyResult
	database.DB.Where("goal_id = ?", goal.ID).Find(&allKRs)

	doneCount := 0
	for _, k := range allKRs {
		if k.IsDone {
			doneCount++
		}
	}
	
	newProgress := 0
	if len(allKRs) > 0 {
		newProgress = (doneCount * 100) / len(allKRs)
	}

	goal.Progress = newProgress
	database.DB.Save(&goal)

	w.WriteHeader(http.StatusCreated)
	respond(w, kr)
}

// ── Milestone Handlers ─────────────────────────────────────────────────────

// GetMilestones handles GET /api/goals/{goalID}/milestones
func GetMilestones(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	goalID := r.PathValue("goalID")

	var goal models.Goal
	if err := database.DB.Where("id = ? AND user_id = ?", goalID, userID).First(&goal).Error; err != nil {
		http.Error(w, `{"error":"Goal not found"}`, http.StatusNotFound)
		return
	}

	var milestones []models.Milestone
	database.DB.Where("goal_id = ?", goalID).Order("created_at asc").Find(&milestones)
	respond(w, milestones)
}

// CreateMilestone handles POST /api/goals/{goalID}/milestones
func CreateMilestone(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	goalID := r.PathValue("goalID")

	var goal models.Goal
	if err := database.DB.Where("id = ? AND user_id = ?", goalID, userID).First(&goal).Error; err != nil {
		http.Error(w, `{"error":"Goal not found"}`, http.StatusNotFound)
		return
	}

	var payload struct {
		Title       string `json:"title"`
		Description string `json:"description"`
		Quarter     string `json:"quarter"`
		TargetDate  string `json:"date"`
		Status      string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, `{"error":"Invalid payload"}`, http.StatusBadRequest)
		return
	}
	if payload.Title == "" {
		http.Error(w, `{"error":"Title is required"}`, http.StatusBadRequest)
		return
	}
	if payload.Status == "" {
		payload.Status = "upcoming"
	}

	milestone := models.Milestone{
		GoalID:      goal.ID,
		Title:       payload.Title,
		Description: payload.Description,
		Quarter:     payload.Quarter,
		TargetDate:  payload.TargetDate,
		Status:      payload.Status,
	}
	if err := database.DB.Create(&milestone).Error; err != nil {
		http.Error(w, `{"error":"Failed to create milestone"}`, http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	respond(w, milestone)
}

// UpdateMilestone handles PATCH /api/goals/{goalID}/milestones/{milestoneID}
func UpdateMilestone(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	goalID := r.PathValue("goalID")
	milestoneID := r.PathValue("milestoneID")

	var goal models.Goal
	if err := database.DB.Where("id = ? AND user_id = ?", goalID, userID).First(&goal).Error; err != nil {
		http.Error(w, `{"error":"Goal not found"}`, http.StatusNotFound)
		return
	}

	var milestone models.Milestone
	if err := database.DB.Where("id = ? AND goal_id = ?", milestoneID, goalID).First(&milestone).Error; err != nil {
		http.Error(w, `{"error":"Milestone not found"}`, http.StatusNotFound)
		return
	}

	var payload struct {
		Title       *string `json:"title"`
		Description *string `json:"description"`
		Quarter     *string `json:"quarter"`
		TargetDate  *string `json:"date"`
		Status      *string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, `{"error":"Invalid payload"}`, http.StatusBadRequest)
		return
	}

	if payload.Title != nil {
		milestone.Title = *payload.Title
	}
	if payload.Description != nil {
		milestone.Description = *payload.Description
	}
	if payload.Quarter != nil {
		milestone.Quarter = *payload.Quarter
	}
	if payload.TargetDate != nil {
		milestone.TargetDate = *payload.TargetDate
	}
	if payload.Status != nil {
		milestone.Status = *payload.Status
	}

	database.DB.Save(&milestone)
	respond(w, milestone)
}

// DeleteMilestone handles DELETE /api/goals/{goalID}/milestones/{milestoneID}
func DeleteMilestone(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	goalID := r.PathValue("goalID")
	milestoneID := r.PathValue("milestoneID")

	var goal models.Goal
	if err := database.DB.Where("id = ? AND user_id = ?", goalID, userID).First(&goal).Error; err != nil {
		http.Error(w, `{"error":"Goal not found"}`, http.StatusNotFound)
		return
	}

	if err := database.DB.Where("id = ? AND goal_id = ?", milestoneID, goalID).Delete(&models.Milestone{}).Error; err != nil {
		http.Error(w, `{"error":"Failed to delete milestone"}`, http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

