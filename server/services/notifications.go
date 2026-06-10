package services

import (
	"evolv-server/database"
	"evolv-server/models"
)

// SendNotification stores an in-app notification for a given user.
func SendNotification(userID uint, title, message, notifType string) error {
	notif := models.Notification{
		UserID:  userID,
		Title:   title,
		Message: message,
		Type:    notifType,
		IsRead:  false,
	}
	return database.DB.Create(&notif).Error
}
