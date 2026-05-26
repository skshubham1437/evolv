package handlers

import (
	"encoding/json"
	"net/http"

	"evolv-server/database"
	"evolv-server/models"
)

type onboardingRequest struct {
	Name         string   `json:"name"`
	FocusAreas   []string `json:"focus_areas"`
	PrimaryGoal  string   `json:"primary_goal"`
}

// CompleteOnboarding saves the onboarding payload and marks the user as onboarded.
func CompleteOnboarding(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)

	var req onboardingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}

	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		http.Error(w, `{"error":"user not found"}`, http.StatusNotFound)
		return
	}

	// Update user name if provided
	if req.Name != "" {
		user.Name = req.Name
	}

	// Save focus areas to preferences
	preferencesBytes, _ := json.Marshal(map[string]interface{}{
		"focus_areas": req.FocusAreas,
	})
	user.Preferences = string(preferencesBytes)
	user.IsOnboarded = true

	if err := database.DB.Save(&user).Error; err != nil {
		http.Error(w, `{"error":"could not save user data"}`, http.StatusInternalServerError)
		return
	}

	// Create their first high-priority task (Weekly Goal)
	if req.PrimaryGoal != "" {
		task := models.Task{
			UserID:      userID,
			Title:       req.PrimaryGoal,
			Description: "My first primary objective set during onboarding.",
			Priority:    "high",
		}
		database.DB.Create(&task)
	}

	// Initialize empty Vision record
	vision := models.Vision{
		UserID: userID,
	}
	database.DB.Create(&vision)

	respond(w, user)
}
