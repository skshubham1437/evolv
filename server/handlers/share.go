package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"

	"evolv-server/database"
	"evolv-server/models"
)

func generateRandomToken() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

// CreateOrRegenerateShare handles POST /api/shares
func CreateOrRegenerateShare(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)

	// Revoke existing shares first
	database.DB.Where("user_id = ?", userID).Delete(&models.AccountabilityShare{})

	// Create new share
	share := models.AccountabilityShare{
		UserID:   userID,
		Token:    generateRandomToken(),
		IsActive: true,
	}

	if err := database.DB.Create(&share).Error; err != nil {
		http.Error(w, `{"error":"Failed to create share token"}`, http.StatusInternalServerError)
		return
	}

	respond(w, share)
}

// GetShareStatus handles GET /api/shares/status
func GetShareStatus(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)

	var share models.AccountabilityShare
	err := database.DB.Where("user_id = ? AND is_active = ?", userID, true).First(&share).Error
	if err != nil {
		respond(w, map[string]interface{}{"token": "", "is_active": false})
		return
	}

	respond(w, share)
}

// RevokeShare handles DELETE /api/shares
func RevokeShare(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)

	if err := database.DB.Where("user_id = ?", userID).Delete(&models.AccountabilityShare{}).Error; err != nil {
		http.Error(w, `{"error":"Failed to revoke share"}`, http.StatusInternalServerError)
		return
	}

	respond(w, map[string]string{"status": "ok"})
}

// GetSharedOverview handles GET /api/shared/overview/{token}
// Note: This is a public handler that does NOT require JWT authentication
func GetSharedOverview(w http.ResponseWriter, r *http.Request) {
	token := r.PathValue("token")
	if token == "" {
		http.Error(w, `{"error":"Token is required"}`, http.StatusBadRequest)
		return
	}

	// 1. Verify token
	var share models.AccountabilityShare
	if err := database.DB.Where("token = ? AND is_active = ?", token, true).First(&share).Error; err != nil {
		http.Error(w, `{"error":"Invalid or expired accountability link"}`, http.StatusNotFound)
		return
	}

	// 2. Fetch owner information
	var user models.User
	if err := database.DB.First(&user, share.UserID).Error; err != nil {
		http.Error(w, `{"error":"User not found"}`, http.StatusNotFound)
		return
	}

	// 3. Fetch public data: goals, focus areas, and habits
	var goals []models.Goal
	database.DB.Where("user_id = ?", share.UserID).Preload("KeyResults").Preload("Milestones").Find(&goals)

	var focusAreas []models.FocusArea
	database.DB.Where("user_id = ?", share.UserID).Find(&focusAreas)

	var habits []models.Habit
	database.DB.Where("user_id = ?", share.UserID).Find(&habits)

	// 4. Return clean, filtered overview data
	respond(w, map[string]interface{}{
		"user_name":   user.Name,
		"goals":       goals,
		"focus_areas": focusAreas,
		"habits":      habits,
	})
}
