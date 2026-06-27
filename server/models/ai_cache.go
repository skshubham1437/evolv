package models

import "time"

// AICache represents a cached result from a generative AI request
type AICache struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	UserID       uint      `gorm:"not null;index" json:"user_id"`
	FeatureType  string    `gorm:"size:50;not null" json:"feature_type"`
	CacheKey     string    `gorm:"size:256;not null;index" json:"cache_key"`
	ResponseText string    `gorm:"type:text;not null" json:"response_text"`
	ExpiresAt    time.Time `gorm:"not null" json:"expires_at"`
	CreatedAt    time.Time `json:"created_at"`
}
