package handlers

import (
	"encoding/json"
	"net/http"

	"evolv-server/database"
	"evolv-server/models"
)

type SubscribePayload struct {
	Endpoint string `json:"endpoint"`
	Keys     struct {
		P256dh string `json:"p256dh"`
		Auth   string `json:"auth"`
	} `json:"keys"`
}

// SubscribePush handles POST /api/notifications/subscribe
func SubscribePush(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)

	var payload SubscribePayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, `{"error":"Invalid request body"}`, http.StatusBadRequest)
		return
	}

	if payload.Endpoint == "" || payload.Keys.P256dh == "" || payload.Keys.Auth == "" {
		http.Error(w, `{"error":"Missing required fields (endpoint, keys)"}`, http.StatusBadRequest)
		return
	}

	var sub models.PushSubscription
	// Find existing subscription by endpoint, or initialize
	err := database.DB.Where("endpoint = ?", payload.Endpoint).First(&sub).Error
	if err == nil {
		// Existing subscription, update user if changed
		sub.UserID = userID
		sub.P256dh = payload.Keys.P256dh
		sub.AuthKey = payload.Keys.Auth
		database.DB.Save(&sub)
	} else {
		// Create new subscription
		sub = models.PushSubscription{
			UserID:   userID,
			Endpoint: payload.Endpoint,
			P256dh:   payload.Keys.P256dh,
			AuthKey:  payload.Keys.Auth,
		}
		if err := database.DB.Create(&sub).Error; err != nil {
			http.Error(w, `{"error":"Failed to save subscription"}`, http.StatusInternalServerError)
			return
		}
	}

	respond(w, map[string]string{"status": "ok"})
}

// UnsubscribePush handles POST /api/notifications/unsubscribe
func UnsubscribePush(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)

	var payload struct {
		Endpoint string `json:"endpoint"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, `{"error":"Invalid request body"}`, http.StatusBadRequest)
		return
	}

	result := database.DB.Where("user_id = ? AND endpoint = ?", userID, payload.Endpoint).Delete(&models.PushSubscription{})
	if result.Error != nil {
		http.Error(w, `{"error":"Failed to remove subscription"}`, http.StatusInternalServerError)
		return
	}

	respond(w, map[string]string{"status": "ok"})
}
