package models

import (
	"time"

	"gorm.io/gorm"
)

// Goal represents a measurable outcome to achieve.
type Goal struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	UserID      uint           `gorm:"not null;index" json:"user_id"`
	Title       string         `gorm:"not null" json:"title"`
	Description string         `gorm:"type:text" json:"description"`
	Priority    string         `gorm:"default:'medium'" json:"priority"` // low, medium, high
	DueDate     string         `json:"due_date"`
	Progress    int            `gorm:"default:0" json:"progress"` // 0-100 percentage
	Status      string         `gorm:"default:'active'" json:"status"` // active, done
	KeyResults  []KeyResult    `json:"key_results"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// KeyResult is a boolean objective linked to a Goal.
type KeyResult struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	GoalID    uint      `gorm:"not null;index" json:"goal_id"`
	Text      string    `gorm:"not null" json:"text"`
	IsDone    bool      `gorm:"default:false" json:"is_done"`
	CreatedAt time.Time `json:"created_at"`
}

// Milestone is a checkpoint roadmap item linked to a Goal.
type Milestone struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	GoalID      uint      `gorm:"not null;index" json:"goal_id"`
	Quarter     string    `json:"quarter"`
	TargetDate  string    `json:"date"` // stored as string e.g. "March 15"
	Title       string    `gorm:"not null" json:"title"`
	Description string    `gorm:"type:text" json:"description"`
	Status      string    `gorm:"default:'upcoming'" json:"status"` // done, active, upcoming
	CreatedAt   time.Time `json:"created_at"`
}
