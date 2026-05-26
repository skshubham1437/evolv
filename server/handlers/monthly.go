package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"evolv-server/database"
	"evolv-server/models"
)

// ── GET /api/monthly/{year}/{month} ───────────────────────────────────────────
func GetMonthlyPlan(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	year, err := strconv.Atoi(r.PathValue("year"))
	if err != nil {
		year = time.Now().Year()
	}
	month, err := strconv.Atoi(r.PathValue("month"))
	if err != nil {
		month = int(time.Now().Month())
	}

	var plan models.MonthlyPlan
	if err := database.DB.Where("user_id = ? AND year = ? AND month = ?", userID, year, month).First(&plan).Error; err != nil {
		// If not found, return an empty initialized struct rather than 404
		plan = models.MonthlyPlan{
			UserID:     userID,
			Year:       year,
			Month:      month,
			Theme:      "",
			Goals:      "[]",
			LifeScores: "{}",
		}
	}

	respond(w, plan)
}

// ── PUT /api/monthly ─────────────────────────────────────────────────────────────
func UpsertMonthlyPlan(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)

	var payload struct {
		Year       int    `json:"year"`
		Month      int    `json:"month"`
		Theme      string `json:"theme"`
		Goals      string `json:"goals"`       // stringified JSON array
		LifeScores string `json:"life_scores"` // stringified JSON object
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, `{"error":"Invalid payload"}`, http.StatusBadRequest)
		return
	}

	if payload.Year == 0 || payload.Month < 1 || payload.Month > 12 {
		http.Error(w, `{"error":"Invalid year or month"}`, http.StatusBadRequest)
		return
	}

	var plan models.MonthlyPlan
	err := database.DB.Where("user_id = ? AND year = ? AND month = ?", userID, payload.Year, payload.Month).First(&plan).Error

	if err != nil {
		// Create new
		plan = models.MonthlyPlan{
			UserID:     userID,
			Year:       payload.Year,
			Month:      payload.Month,
			Theme:      payload.Theme,
			Goals:      payload.Goals,
			LifeScores: payload.LifeScores,
		}
		if err := database.DB.Create(&plan).Error; err != nil {
			http.Error(w, `{"error":"Failed to create monthly plan"}`, http.StatusInternalServerError)
			return
		}
	} else {
		// Update existing
		plan.Theme = payload.Theme
		if payload.Goals != "" {
			plan.Goals = payload.Goals
		}
		if payload.LifeScores != "" {
			plan.LifeScores = payload.LifeScores
		}
		if err := database.DB.Save(&plan).Error; err != nil {
			http.Error(w, `{"error":"Failed to update monthly plan"}`, http.StatusInternalServerError)
			return
		}
	}

	respond(w, plan)
}
