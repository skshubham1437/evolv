package models

import (
	"time"

	"gorm.io/gorm"
)

// Project represents a group of related tasks.
type Project struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	UserID      uint           `gorm:"not null;index" json:"user_id"`
	Title       string         `gorm:"not null" json:"title"`
	Description string         `json:"description"`
	Color       string         `gorm:"default:'#D2BBFF'" json:"color"`
	Status      string         `gorm:"default:'active'" json:"status"` // active, archived, completed
	Deadline    *time.Time     `json:"deadline"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}
