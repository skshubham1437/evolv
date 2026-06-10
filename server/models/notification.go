package models

import "time"

// Notification represents an in-app system or behavioral alert.
type Notification struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"not null;index" json:"user_id"`
	Title     string    `gorm:"not null" json:"title"`
	Message   string    `gorm:"type:text;not null" json:"message"`
	Type      string    `gorm:"default:'info'" json:"type"` // e.g. "info", "warning", "habit_shield", "task_overdue"
	IsRead    bool      `gorm:"default:false;index" json:"is_read"`
	CreatedAt time.Time `json:"created_at"`
}
