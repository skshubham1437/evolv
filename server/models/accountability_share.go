package models

import "time"

// AccountabilityShare represents a token allowing read-only access to user stats
type AccountabilityShare struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"not null;index" json:"user_id"`
	Token     string    `gorm:"size:100;not null;uniqueIndex" json:"token"`
	IsActive  bool      `gorm:"default:true" json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
}
