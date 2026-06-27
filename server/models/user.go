package models

import (
	"time"

	"gorm.io/gorm"
)

// User represents an authenticated person using the system.
type User struct {
	ID           uint           `gorm:"primaryKey" json:"id"`
	Email        string         `gorm:"uniqueIndex;not null" json:"email"`
	PasswordHash string         `gorm:"not null" json:"-"` // never exposed in JSON
	Name                string         `gorm:"not null" json:"name"`
	Preferences         string         `gorm:"type:jsonb;default:'[]'" json:"preferences"` // free-form JSON
	IsOnboarded         bool           `gorm:"default:false" json:"is_onboarded"`
	PushEnabled         bool           `gorm:"default:true" json:"push_enabled"`
	WeeklyDigestEnabled bool           `gorm:"default:true" json:"weekly_digest_enabled"`
	CreatedAt           time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}
