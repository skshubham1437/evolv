package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"evolv-server/database"
	"evolv-server/models"
)

// isoWeek returns the ISO year and week number for a given date.
func isoWeek(t time.Time) (int, int) {
	return t.ISOWeek()
}

// parseDate parses YYYY-MM-DD query param, defaulting to today if blank or invalid.
func parseDate(s string) time.Time {
	if s == "" {
		return time.Now()
	}
	t, err := time.Parse("2006-01-02", s)
	if err != nil {
		return time.Now()
	}
	return t
}

// weekBounds returns the Monday and Sunday of the ISO week containing t (as YYYY-MM-DD strings).
func weekBounds(t time.Time) (string, string) {
	wd := int(t.Weekday())
	if wd == 0 {
		wd = 7 // Sunday → 7
	}
	monday := t.AddDate(0, 0, -(wd - 1)).Truncate(24 * time.Hour)
	sunday := monday.AddDate(0, 0, 6)
	return monday.Format("2006-01-02"), sunday.Format("2006-01-02")
}

// ── GET /api/weekly/overview?date=YYYY-MM-DD ─────────────────────────────────
// Returns: weekly plan (theme/notes), time blocks for the selected day,
//          high-priority tasks (MITs), and the week's date range.
func GetWeeklyOverview(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	date := parseDate(r.URL.Query().Get("date"))

	year, weekNum := isoWeek(date)
	mondayStr, sundayStr := weekBounds(date)
	dateStr := date.Format("2006-01-02")

	// Weekly plan (may not exist yet)
	var plan models.WeeklyPlan
	database.DB.Where("user_id = ? AND year = ? AND week_number = ?", userID, year, weekNum).First(&plan)

	// Time blocks for the selected day
	var blocks []models.TimeBlock
	database.DB.Where("user_id = ? AND date = ?", userID, dateStr).
		Order("start_time asc").Find(&blocks)

	// MITs: top 5 high-priority uncompleted tasks
	var highTasks []models.Task
	database.DB.Where("user_id = ? AND is_completed = ? AND priority = ?", userID, false, "high").
		Order("position asc, created_at asc").Limit(5).Find(&highTasks)
	// Fill remainder with medium if < 3
	if len(highTasks) < 3 {
		var medTasks []models.Task
		need := 3 - len(highTasks)
		database.DB.Where("user_id = ? AND is_completed = ? AND priority = ?", userID, false, "medium").
			Order("position asc, created_at asc").Limit(need).Find(&medTasks)
		highTasks = append(highTasks, medTasks...)
	}

	// Week score: derive from habit logs in this week
	weekScore := computeWeekScore(userID, mondayStr, sundayStr)

	respond(w, map[string]interface{}{
		"date":        dateStr,
		"year":        year,
		"week_number": weekNum,
		"week_start":  mondayStr,
		"week_end":    sundayStr,
		"plan":        plan,
		"time_blocks": blocks,
		"mits":        highTasks,
		"week_score":  weekScore,
	})
}

// computeWeekScore derives a 0-100 score from habit consistency this week.
func computeWeekScore(userID uint, mondayStr, sundayStr string) int {
	monday, _ := time.Parse("2006-01-02", mondayStr)
	sunday, _ := time.Parse("2006-01-02", sundayStr)
	// Only score up to today
	ceiling := time.Now().Truncate(24 * time.Hour)
	if sunday.Before(ceiling) {
		ceiling = sunday
	}

	// Days elapsed (Mon=1 → today)
	daysElapsed := int(ceiling.Sub(monday).Hours()/24) + 1
	if daysElapsed <= 0 {
		daysElapsed = 1
	}

	// Habit logs in this week so far
	var habits []models.Habit
	database.DB.Where("user_id = ?", userID).Find(&habits)
	if len(habits) == 0 {
		return 0
	}

	ids := make([]uint, 0, len(habits))
	for _, h := range habits {
		ids = append(ids, h.ID)
	}

	var logs []models.HabitLog
	database.DB.Where("habit_id IN ? AND completed_at >= ? AND completed_at < ?",
		ids, monday, ceiling.AddDate(0, 0, 1)).Find(&logs)

	// Expected: all habits × elapsed days
	expected := len(habits) * daysElapsed
	if expected == 0 {
		return 0
	}
	score := (len(logs) * 100) / expected
	if score > 100 {
		score = 100
	}
	return score
}

// ── PUT /api/weekly/plan ──────────────────────────────────────────────────────
// Upserts the WeeklyPlan for the user's current or supplied week.
func UpsertWeeklyPlan(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)

	var payload struct {
		Date  string `json:"date"` // YYYY-MM-DD, defaults to today
		Theme string `json:"theme"`
		Notes string `json:"notes"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, `{"error":"Invalid payload"}`, http.StatusBadRequest)
		return
	}

	date := parseDate(payload.Date)
	year, weekNum := isoWeek(date)

	var plan models.WeeklyPlan
	result := database.DB.Where("user_id = ? AND year = ? AND week_number = ?", userID, year, weekNum).First(&plan)

	if result.Error != nil {
		// Create
		plan = models.WeeklyPlan{
			UserID:     userID,
			Year:       year,
			WeekNumber: weekNum,
			Theme:      payload.Theme,
			Notes:      payload.Notes,
		}
		database.DB.Create(&plan)
	} else {
		// Update
		if payload.Theme != "" {
			plan.Theme = payload.Theme
		}
		plan.Notes = payload.Notes
		database.DB.Save(&plan)
	}

	respond(w, plan)
}

// ── GET /api/weekly/time-blocks?date=YYYY-MM-DD ───────────────────────────────
func GetTimeBlocks(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	dateStr := r.URL.Query().Get("date")
	if dateStr == "" {
		dateStr = time.Now().Format("2006-01-02")
	}

	var blocks []models.TimeBlock
	database.DB.Where("user_id = ? AND date = ?", userID, dateStr).
		Order("start_time asc").Find(&blocks)
	respond(w, blocks)
}

// ── POST /api/weekly/time-blocks ──────────────────────────────────────────────
func CreateTimeBlock(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)

	var payload struct {
		Date      string `json:"date"`
		StartTime string `json:"start_time"`
		EndTime   string `json:"end_time"`
		Title     string `json:"title"`
		Notes     string `json:"notes"`
		BlockType string `json:"block_type"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, `{"error":"Invalid payload"}`, http.StatusBadRequest)
		return
	}
	if payload.Title == "" || payload.StartTime == "" || payload.EndTime == "" {
		http.Error(w, `{"error":"title, start_time, and end_time are required"}`, http.StatusBadRequest)
		return
	}
	if payload.Date == "" {
		payload.Date = time.Now().Format("2006-01-02")
	}
	if payload.BlockType == "" {
		payload.BlockType = "deep_work"
	}

	block := models.TimeBlock{
		UserID:    userID,
		Date:      payload.Date,
		StartTime: payload.StartTime,
		EndTime:   payload.EndTime,
		Title:     payload.Title,
		Notes:     payload.Notes,
		BlockType: payload.BlockType,
	}
	if err := database.DB.Create(&block).Error; err != nil {
		http.Error(w, `{"error":"Failed to create time block"}`, http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusCreated)
	respond(w, block)
}

// ── PATCH /api/weekly/time-blocks/{id} ────────────────────────────────────────
func UpdateTimeBlock(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	id, _ := strconv.Atoi(r.PathValue("id"))

	var block models.TimeBlock
	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).First(&block).Error; err != nil {
		http.Error(w, `{"error":"Time block not found"}`, http.StatusNotFound)
		return
	}

	var payload struct {
		StartTime *string `json:"start_time"`
		EndTime   *string `json:"end_time"`
		Title     *string `json:"title"`
		Notes     *string `json:"notes"`
		BlockType *string `json:"block_type"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, `{"error":"Invalid payload"}`, http.StatusBadRequest)
		return
	}

	if payload.StartTime != nil { block.StartTime = *payload.StartTime }
	if payload.EndTime != nil   { block.EndTime   = *payload.EndTime   }
	if payload.Title != nil     { block.Title     = *payload.Title     }
	if payload.Notes != nil     { block.Notes     = *payload.Notes     }
	if payload.BlockType != nil { block.BlockType = *payload.BlockType }

	database.DB.Save(&block)
	respond(w, block)
}

// ── DELETE /api/weekly/time-blocks/{id} ───────────────────────────────────────
func DeleteTimeBlock(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	id, _ := strconv.Atoi(r.PathValue("id"))

	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).Delete(&models.TimeBlock{}).Error; err != nil {
		http.Error(w, `{"error":"Failed to delete time block"}`, http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
