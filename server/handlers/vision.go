package handlers

import (
	"encoding/json"
	"net/http"

	"evolv-server/database"
	"evolv-server/models"
)

// GetVision retrieves the user's vision data.
func GetVision(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)

	var vision models.Vision
	if err := database.DB.Where("user_id = ?", userID).First(&vision).Error; err != nil {
		// Create default if not found
		vision = models.Vision{UserID: userID}
		database.DB.Create(&vision)
	}

	respond(w, vision)
}

// UpdateVision updates specific parts of the vision data.
func UpdateVision(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)

	var req map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}

	var vision models.Vision
	if err := database.DB.Where("user_id = ?", userID).First(&vision).Error; err != nil {
		http.Error(w, `{"error":"vision not found"}`, http.StatusNotFound)
		return
	}

	// Dynamic updates based on JSON keys (assuming frontend sends stringified JSON for these columns)
	if coreValues, ok := req["core_values"].(string); ok {
		vision.CoreValues = coreValues
	}
	if identityStatements, ok := req["identity_statements"].(string); ok {
		vision.IdentityStatements = identityStatements
	}
	if idealDay, ok := req["ideal_day"].(string); ok {
		vision.IdealDay = idealDay
	}
	if visionImages, ok := req["vision_images"].(string); ok {
		vision.VisionImages = visionImages
	}
	if futureSelf, ok := req["future_self_text"].(string); ok {
		vision.FutureSelfText = futureSelf
	}

	if err := database.DB.Save(&vision).Error; err != nil {
		http.Error(w, `{"error":"could not update vision"}`, http.StatusInternalServerError)
		return
	}

	respond(w, vision)
}

// --- Focus Areas ---

func GetFocusAreas(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	var areas []models.FocusArea
	database.DB.Where("user_id = ?", userID).Find(&areas)

	// Seed defaults if empty
	if len(areas) == 0 {
		defaultAreas := []models.FocusArea{
			{UserID: userID, Name: "Health", Icon: "fitness_center", CurrentScore: 5, TargetScore: 10},
			{UserID: userID, Name: "Career", Icon: "work", CurrentScore: 5, TargetScore: 10},
			{UserID: userID, Name: "Wealth", Icon: "account_balance", CurrentScore: 5, TargetScore: 10},
			{UserID: userID, Name: "Relationships", Icon: "favorite", CurrentScore: 5, TargetScore: 10},
			{UserID: userID, Name: "Mind", Icon: "psychology", CurrentScore: 5, TargetScore: 10},
			{UserID: userID, Name: "Environment", Icon: "home", CurrentScore: 5, TargetScore: 10},
		}
		database.DB.Create(&defaultAreas)
		areas = defaultAreas
	}

	respond(w, areas)
}

func UpdateFocusArea(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	id := r.PathValue("id")

	var area models.FocusArea
	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).First(&area).Error; err != nil {
		http.Error(w, `{"error":"focus area not found"}`, http.StatusNotFound)
		return
	}

	var req struct {
		CurrentScore *int `json:"current_score"`
		TargetScore  *int `json:"target_score"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid body"}`, http.StatusBadRequest)
		return
	}

	if req.CurrentScore != nil {
		area.CurrentScore = *req.CurrentScore
	}
	if req.TargetScore != nil {
		area.TargetScore = *req.TargetScore
	}

	database.DB.Save(&area)
	respond(w, area)
}

// --- Bucket List ---

func GetBucketListItems(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	var items []models.BucketListItem
	database.DB.Where("user_id = ?", userID).Order("is_completed asc, created_at desc").Find(&items)
	
	// Seed if empty
	if len(items) == 0 {
		defaultItems := []models.BucketListItem{
			{UserID: userID, Title: "See the Northern Lights", Category: "Travel", IsCompleted: false},
			{UserID: userID, Title: "Launch my own business", Category: "Career", IsCompleted: false},
			{UserID: userID, Title: "Run a marathon", Category: "Health", IsCompleted: false},
		}
		database.DB.Create(&defaultItems)
		items = defaultItems
	}

	respond(w, items)
}

func CreateBucketListItem(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	var req struct {
		Title    string `json:"title"`
		Category string `json:"category"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Title == "" {
		http.Error(w, `{"error":"invalid body"}`, http.StatusBadRequest)
		return
	}

	item := models.BucketListItem{
		UserID:   userID,
		Title:    req.Title,
		Category: req.Category,
	}
	database.DB.Create(&item)
	respond(w, item)
}

func ToggleBucketListItem(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	id := r.PathValue("id")

	var item models.BucketListItem
	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).First(&item).Error; err != nil {
		http.Error(w, `{"error":"item not found"}`, http.StatusNotFound)
		return
	}

	item.IsCompleted = !item.IsCompleted
	database.DB.Save(&item)
	respond(w, item)
}

func DeleteBucketListItem(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	id := r.PathValue("id")

	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).Delete(&models.BucketListItem{}).Error; err != nil {
		http.Error(w, `{"error":"could not delete item"}`, http.StatusInternalServerError)
		return
	}

	respond(w, map[string]bool{"success": true})
}
