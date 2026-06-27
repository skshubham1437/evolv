package services

import (
	"evolv-server/database"
	"evolv-server/models"
)

// SendNotification stores an in-app notification for a given user and triggers a web push.
func SendNotification(userID uint, title, message, notifType string) error {
	notif := models.Notification{
		UserID:  userID,
		Title:   title,
		Message: message,
		Type:    notifType,
		IsRead:  false,
	}
	
	if err := database.DB.Create(&notif).Error; err != nil {
		return err
	}

	// Trigger Web Push notification asynchronously
	_ = SendPushNotification(userID, title, message)
	
	return nil
}

