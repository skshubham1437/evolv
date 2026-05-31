package models

import (
	"time"

	"gorm.io/gorm"
)

// Habit represents a repetition and identity-driven action.
type Habit struct {
	ID           uint           `gorm:"primaryKey" json:"id"`
	UserID       uint           `gorm:"not null;index" json:"user_id"`
	Title        string         `gorm:"not null" json:"title"`
	Description  string         `json:"description"`
	Frequency    string         `gorm:"default:'daily'" json:"frequency"` // daily, weekly
	Streak       int            `gorm:"default:0" json:"streak"`
	Category     string         `gorm:"default:'Health'" json:"category"`
	StackAfterID *uint          `json:"stack_after_id"`                     // null if not stacked
	RoutineType            string         `gorm:"default:'none'" json:"routine_type"` // morning, night, none
	Position               int            `gorm:"default:0" json:"position"`
	StreakShieldActive     bool           `gorm:"default:false" json:"streak_shield_active"`
	StreakShieldsRemaining int            `gorm:"default:0" json:"streak_shields_remaining"`
	CreatedAt              time.Time      `json:"created_at"`
	UpdatedAt              time.Time      `json:"updated_at"`
	DeletedAt              gorm.DeletedAt `gorm:"index" json:"-"`
}

// HabitLog represents a single completion instance of a Habit.
type HabitLog struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	HabitID     uint      `gorm:"not null;index:idx_habitlog_habit_completed" json:"habit_id"`
	CompletedAt time.Time `gorm:"not null;index:idx_habitlog_habit_completed" json:"completed_at"`
}
