package models

import (
	"time"

	"gorm.io/gorm"
)

// JournalEntry represents a daily journal/reflection entry.
type JournalEntry struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	UserID    uint           `gorm:"not null;uniqueIndex:idx_journal_user_date" json:"user_id"`
	Date      string         `gorm:"not null;uniqueIndex:idx_journal_user_date" json:"date"` // YYYY-MM-DD
	Content   string         `gorm:"type:text" json:"content"`
	Mood       int            `gorm:"default:3" json:"mood"`   // 1-5 scale
	Energy     int            `gorm:"default:3" json:"energy"` // 1-5 scale
	Stress     int            `gorm:"default:3" json:"stress"` // 1-5 scale
	Confidence int            `gorm:"default:3" json:"confidence"` // 1-5 scale
	Gratitude  string         `gorm:"type:jsonb;default:'[]'" json:"gratitude"`
	Wins       string         `gorm:"type:jsonb;default:'[]'" json:"wins"`
	Lessons    string         `gorm:"type:jsonb;default:'[]'" json:"lessons"`
	Sentiment  string         `gorm:"type:text" json:"sentiment"`
	Themes     string         `gorm:"type:jsonb;default:'[]'" json:"themes"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// EnergyLog represents a real-time energy level entry logged by the user.
type EnergyLog struct {
	ID       uint      `gorm:"primaryKey" json:"id"`
	UserID   uint      `gorm:"not null;index" json:"user_id"`
	LoggedAt time.Time `gorm:"not null;index" json:"logged_at"`
	Energy   int       `gorm:"not null" json:"energy"` // 1-5 scale
}
