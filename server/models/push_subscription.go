package models

import "time"

// PushSubscription represents a user's browser push credentials
type PushSubscription struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"not null;index" json:"user_id"`
	Endpoint  string    `gorm:"uniqueIndex;not null" json:"endpoint"`
	P256dh    string    `gorm:"not null" json:"p256dh"`
	AuthKey   string    `gorm:"not null" json:"auth_key"`
	CreatedAt time.Time `json:"created_at"`
}
