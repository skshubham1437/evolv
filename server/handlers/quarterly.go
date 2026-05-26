package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"evolv-server/database"
	"evolv-server/models"
)

// ── GET /api/quarterly/{year}/{quarter}/scorecard ──────────────────────────────
func GetQuarterlyScorecard(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	year, err := strconv.Atoi(r.PathValue("year"))
	if err != nil {
		year = time.Now().Year()
	}
	quarter, err := strconv.Atoi(r.PathValue("quarter"))
	if err != nil {
		quarter = (int(time.Now().Month()) - 1) / 3 + 1
	}

	var objectives []models.QuarterlyObjective
	database.DB.Where("user_id = ? AND year = ? AND quarter = ?", userID, year, quarter).
		Order("created_at asc").Find(&objectives)

	respond(w, objectives)
}

// ── POST /api/quarterly ──────────────────────────────────────────────────────────
func CreateQuarterlyObjective(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)

	var payload struct {
		GoalID  *uint  `json:"goal_id"`
		Year    int    `json:"year"`
		Quarter int    `json:"quarter"`
		Title   string `json:"title"`
		Outcome string `json:"outcome"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, `{"error":"Invalid payload"}`, http.StatusBadRequest)
		return
	}
	if payload.Title == "" || payload.Year == 0 || payload.Quarter < 1 || payload.Quarter > 4 {
		http.Error(w, `{"error":"Invalid or missing fields"}`, http.StatusBadRequest)
		return
	}

	obj := models.QuarterlyObjective{
		UserID:  userID,
		GoalID:  payload.GoalID,
		Year:    payload.Year,
		Quarter: payload.Quarter,
		Title:   payload.Title,
		Outcome: payload.Outcome,
		Status:  "not_started",
	}

	if err := database.DB.Create(&obj).Error; err != nil {
		http.Error(w, `{"error":"Failed to create objective"}`, http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusCreated)
	respond(w, obj)
}

// ── PATCH /api/quarterly/{id} ───────────────────────────────────────────────────
func UpdateQuarterlyObjective(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	id, _ := strconv.Atoi(r.PathValue("id"))

	var obj models.QuarterlyObjective
	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).First(&obj).Error; err != nil {
		http.Error(w, `{"error":"Objective not found"}`, http.StatusNotFound)
		return
	}

	var payload struct {
		Title   *string `json:"title"`
		Outcome *string `json:"outcome"`
		Status  *string `json:"status"` // not_started, on_track, at_risk, completed
		GoalID  *uint   `json:"goal_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, `{"error":"Invalid payload"}`, http.StatusBadRequest)
		return
	}

	if payload.Title != nil {
		obj.Title = *payload.Title
	}
	if payload.Outcome != nil {
		obj.Outcome = *payload.Outcome
	}
	if payload.Status != nil {
		obj.Status = *payload.Status
	}
	if payload.GoalID != nil {
		if *payload.GoalID == 0 {
			obj.GoalID = nil
		} else {
			obj.GoalID = payload.GoalID
		}
	}

	database.DB.Save(&obj)
	respond(w, obj)
}

// ── DELETE /api/quarterly/{id} ──────────────────────────────────────────────────
func DeleteQuarterlyObjective(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	id, _ := strconv.Atoi(r.PathValue("id"))

	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).Delete(&models.QuarterlyObjective{}).Error; err != nil {
		http.Error(w, `{"error":"Failed to delete objective"}`, http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
