package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"evolv-server/database"
	"evolv-server/models"
	"evolv-server/services"
)

// --- Journal Entry Handlers ---

func CreateJournalEntry(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)

	var entry models.JournalEntry
	if err := json.NewDecoder(r.Body).Decode(&entry); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}
	if entry.Date == "" {
		http.Error(w, `{"error":"date is required (YYYY-MM-DD)"}`, http.StatusBadRequest)
		return
	}

	entry.UserID = userID

	// Check if entry already exists for this date
	var existing models.JournalEntry
	if err := database.DB.Where("user_id = ? AND date = ?", userID, entry.Date).First(&existing).Error; err == nil {
		http.Error(w, `{"error":"journal entry already exists for this date, use PATCH to update"}`, http.StatusConflict)
		return
	}

	// Analyze journal entry if content is present
	if entry.Content != "" {
		sentiment, themes, err := services.AnalyzeJournalEntry(r.Context(), entry.Content, entry.Gratitude, entry.Wins, entry.Lessons)
		if err == nil {
			entry.Sentiment = sentiment
			themeBytes, _ := json.Marshal(themes)
			entry.Themes = string(themeBytes)
		}
	} else {
		entry.Themes = "[]"
	}

	if err := database.DB.Create(&entry).Error; err != nil {
		http.Error(w, `{"error":"could not create journal entry"}`, http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	respond(w, entry)
}

func ListJournalEntries(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)

	pageStr := r.URL.Query().Get("page")
	limitStr := r.URL.Query().Get("limit")

	var entries []models.JournalEntry
	query := database.DB.Where("user_id = ?", userID).Order("date desc")

	if pageStr != "" || limitStr != "" {
		page := 1
		limit := 10
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
			if limit > 100 {
				limit = 100 // cap limit to prevent abuse
			}
		}
		offset := (page - 1) * limit

		var total int64
		database.DB.Model(&models.JournalEntry{}).Where("user_id = ?", userID).Count(&total)

		w.Header().Set("X-Total-Count", strconv.FormatInt(total, 10))
		w.Header().Set("X-Total-Pages", strconv.FormatInt((total+int64(limit)-1)/int64(limit), 10))
		w.Header().Set("X-Page", strconv.Itoa(page))
		w.Header().Set("X-Limit", strconv.Itoa(limit))

		query = query.Limit(limit).Offset(offset)
	}

	query.Find(&entries)
	respond(w, entries)
}

func GetJournalByDate(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	date := r.PathValue("date") // YYYY-MM-DD

	var entry models.JournalEntry
	if err := database.DB.Where("user_id = ? AND date = ?", userID, date).First(&entry).Error; err != nil {
		http.Error(w, `{"error":"no journal entry for this date"}`, http.StatusNotFound)
		return
	}

	respond(w, entry)
}

func UpdateJournalEntry(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	id, _ := strconv.Atoi(r.PathValue("id"))

	var entry models.JournalEntry
	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).First(&entry).Error; err != nil {
		http.Error(w, `{"error":"journal entry not found"}`, http.StatusNotFound)
		return
	}

	var updates models.JournalEntry
	if err := json.NewDecoder(r.Body).Decode(&updates); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}

	// Update fields
	entry.Content = updates.Content
	entry.Mood = updates.Mood
	entry.Energy = updates.Energy
	entry.Stress = updates.Stress
	entry.Confidence = updates.Confidence
	entry.Gratitude = updates.Gratitude
	entry.Wins = updates.Wins
	entry.Lessons = updates.Lessons

	// Analyze journal entry if content is present
	if entry.Content != "" {
		sentiment, themes, err := services.AnalyzeJournalEntry(r.Context(), entry.Content, entry.Gratitude, entry.Wins, entry.Lessons)
		if err == nil {
			entry.Sentiment = sentiment
			themeBytes, _ := json.Marshal(themes)
			entry.Themes = string(themeBytes)
		}
	}

	if err := database.DB.Save(&entry).Error; err != nil {
		http.Error(w, `{"error":"could not update journal entry"}`, http.StatusInternalServerError)
		return
	}

	respond(w, entry)
}

// LogEnergy handles POST /api/energy
func LogEnergy(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	var payload struct {
		Energy int `json:"energy"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, `{"error":"Invalid request payload"}`, http.StatusBadRequest)
		return
	}
	if payload.Energy < 1 || payload.Energy > 5 {
		http.Error(w, `{"error":"Energy must be between 1 and 5"}`, http.StatusBadRequest)
		return
	}

	energyLog := models.EnergyLog{
		UserID:   userID,
		LoggedAt: time.Now(),
		Energy:   payload.Energy,
	}

	if err := database.DB.Create(&energyLog).Error; err != nil {
		http.Error(w, `{"error":"Failed to create energy log"}`, http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	respond(w, energyLog)
}

