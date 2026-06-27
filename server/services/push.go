package services

import (
	"encoding/json"
	"log/slog"
	"os"

	"evolv-server/database"
	"evolv-server/models"

	"github.com/SherClockHolmes/webpush-go"
)

// WebPushPayload matches the structure the client expects on receipt
type WebPushPayload struct {
	Title string `json:"title"`
	Body  string `json:"body"`
}

// SendPushNotification dispatches a push event to all registered devices of a user
func SendPushNotification(userID uint, title, message string) error {
	publicKey := os.Getenv("VAPID_PUBLIC_KEY")
	privateKey := os.Getenv("VAPID_PRIVATE_KEY")
	contactEmail := os.Getenv("VAPID_CONTACT_EMAIL")
	if contactEmail == "" {
		contactEmail = "support@evolv.co"
	}

	// 1. Fetch user's active push subscriptions
	var subscriptions []models.PushSubscription
	if err := database.DB.Where("user_id = ?", userID).Find(&subscriptions).Error; err != nil {
		slog.Error("Failed to fetch subscriptions for user", "userID", userID, "error", err)
		return err
	}

	if len(subscriptions) == 0 {
		slog.Debug("No push subscriptions found for user", "userID", userID)
		return nil
	}

	// 2. Check if VAPID keys are configured
	if publicKey == "" || privateKey == "" {
		slog.Info("Web Push VAPID credentials not set. Logging notification details (dev mode):",
			"userID", userID,
			"title", title,
			"message", message,
		)
		return nil
	}

	payload, err := json.Marshal(WebPushPayload{Title: title, Body: message})
	if err != nil {
		slog.Error("Failed to marshal push payload", "error", err)
		return err
	}

	// 3. Dispatch to all active subscriptions
	for _, sub := range subscriptions {
		s := webpush.Subscription{
			Endpoint: sub.Endpoint,
			Keys: webpush.Keys{
				P256dh: sub.P256dh,
				Auth:   sub.AuthKey,
			},
		}

		// Fire Web Push asynchronously so slow network calls don't block
		go func(sub models.PushSubscription) {
			resp, err := webpush.SendNotification(payload, &s, &webpush.Options{
				Subscriber:      contactEmail,
				VAPIDPublicKey:  publicKey,
				VAPIDPrivateKey: privateKey,
				TTL:             30,
			})
			if err != nil {
				slog.Error("Failed to deliver Web Push notification", "endpoint", sub.Endpoint, "error", err)
				// If subscription is expired or unsubscribed, remove it from the DB
				if resp != nil && (resp.StatusCode == 404 || resp.StatusCode == 410) {
					database.DB.Delete(&sub)
					slog.Info("Removed expired push subscription from DB", "id", sub.ID)
				}
				return
			}
			defer resp.Body.Close()
			slog.Debug("Web Push notification delivered successfully", "userID", userID)
		}(sub)
	}

	return nil
}
