package models

import (
	"time"

	"gorm.io/gorm"
)

// Vision represents a user's long-term identity and goals.
type Vision struct {
	ID                 uint           `gorm:"primaryKey" json:"id"`
	UserID             uint           `gorm:"uniqueIndex;not null" json:"user_id"` // 1:1 relationship with User
	CoreValues         string         `gorm:"type:jsonb;default:'[]'" json:"core_values"`
	IdentityStatements string         `gorm:"type:jsonb;default:'[]'" json:"identity_statements"`
	IdealDay           string         `gorm:"type:jsonb;default:'[]'" json:"ideal_day"`
	VisionImages       string         `gorm:"type:jsonb;default:'[]'" json:"vision_images"` // URLs to Unsplash or S3
	FutureSelfText     string         `gorm:"type:text" json:"future_self_text"`
	CreatedAt          time.Time      `json:"created_at"`
	UpdatedAt          time.Time      `json:"updated_at"`
	DeletedAt          gorm.DeletedAt `gorm:"index" json:"-"`
}

// FocusArea represents a category on the Life Balance Radar Chart.
type FocusArea struct {
	ID           uint           `gorm:"primaryKey" json:"id"`
	UserID       uint           `gorm:"index;not null" json:"user_id"`
	Name         string         `gorm:"not null" json:"name"`
	Icon         string         `gorm:"default:'star'" json:"icon"`
	CurrentScore int            `gorm:"default:5" json:"current_score"` // 1-10
	TargetScore  int            `gorm:"default:10" json:"target_score"` // 1-10
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}

// BucketListItem represents an item on the user's bucket list.
type BucketListItem struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	UserID      uint           `gorm:"index;not null" json:"user_id"`
	Title       string         `gorm:"not null" json:"title"`
	Category    string         `gorm:"default:'general'" json:"category"`
	IsCompleted bool           `gorm:"default:false" json:"is_completed"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}
