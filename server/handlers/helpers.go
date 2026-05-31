package handlers

import (
	"encoding/json"
	"net/http"

	"evolv-server/middleware"
	"evolv-server/models"
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
