package models

import (
	"time"

	"gorm.io/gorm"
)

// Task represents an outcome-driven action that is completed once.
type Task struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	UserID      uint           `gorm:"not null;index" json:"user_id"`
	Title       string         `gorm:"not null" json:"title"`
	Description string         `json:"description"`
	IsCompleted bool           `gorm:"default:false" json:"is_completed"`
	Priority    string         `gorm:"default:'medium'" json:"priority"` // low, medium, high
	DueDate     *time.Time     `json:"due_date"`
	Position    int            `gorm:"default:0" json:"position"` // for ordering
	ProjectID    *uint          `json:"project_id"`
	ParentTaskID *uint          `json:"parent_task_id"`
	GoalID       *uint          `gorm:"index" json:"goal_id"`
	ObjectiveID  *uint          `gorm:"index" json:"objective_id"`
	IsUrgent     bool           `gorm:"default:false" json:"is_urgent"`
	IsImportant  bool           `gorm:"default:false" json:"is_important"`
	Tags         string         `gorm:"type:text;default:''" json:"tags"`
	Dependencies string         `gorm:"type:text;default:''" json:"dependencies"`
	Notes        string         `json:"notes"`
	Recurrence   string         `gorm:"type:text;default:''" json:"recurrence"` // "", "daily", "weekly", "monthly"
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}
