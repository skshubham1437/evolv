package models

import (
	"time"

	"gorm.io/gorm"
)

// WeeklyPlan stores the theme and focus intent for a specific ISO week.
type WeeklyPlan struct {
	ID            uint           `gorm:"primaryKey" json:"id"`
	UserID        uint           `gorm:"uniqueIndex:idx_weekly_user_year_week;not null" json:"user_id"`
	Year          int            `gorm:"uniqueIndex:idx_weekly_user_year_week;not null" json:"year"`
	WeekNumber    int            `gorm:"uniqueIndex:idx_weekly_user_year_week;not null" json:"week_number"` // ISO week 1-53
	Theme         string         `gorm:"type:text" json:"theme"`      // e.g. "Ship the MVP"
	Notes         string         `gorm:"type:text" json:"notes"`
	ReviewSummary string         `gorm:"type:text" json:"review_summary"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`
}

// TimeBlock is a scheduled block of time for a specific day.
type TimeBlock struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	UserID    uint           `gorm:"index;not null" json:"user_id"`
	Date      string         `gorm:"not null;index" json:"date"`       // YYYY-MM-DD
	StartTime string         `gorm:"not null" json:"start_time"`       // HH:MM (24h)
	EndTime   string         `gorm:"not null" json:"end_time"`         // HH:MM (24h)
	Title     string         `gorm:"not null" json:"title"`
	Notes     string         `gorm:"type:text" json:"notes"`
	BlockType string         `gorm:"default:'deep_work'" json:"block_type"` // deep_work, meeting, break, personal, admin
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// QuarterlyObjective represents an outcome for a specific quarter, linked to a yearly goal.
type QuarterlyObjective struct {
	ID         uint           `gorm:"primaryKey" json:"id"`
	UserID     uint           `gorm:"index:idx_quarterly_user_year_quarter;not null" json:"user_id"`
	GoalID    *uint          `json:"goal_id"` // pointer so it can be null
	Year      int            `gorm:"index:idx_quarterly_user_year_quarter;not null" json:"year"`
	Quarter   int            `gorm:"index:idx_quarterly_user_year_quarter;not null" json:"quarter"` // 1, 2, 3, 4
	Title     string         `gorm:"not null" json:"title"`
	Outcome   string         `gorm:"type:text" json:"outcome"` // Description of what success looks like
	Status    string         `gorm:"default:'not_started'" json:"status"` // not_started, on_track, at_risk, completed
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// MonthlyPlan stores the focus theme, snapshot of life scores, and associated goals for a specific month.
type MonthlyPlan struct {
	ID            uint           `gorm:"primaryKey" json:"id"`
	UserID        uint           `gorm:"uniqueIndex:idx_monthly_user_year_month;not null" json:"user_id"`
	Year          int            `gorm:"uniqueIndex:idx_monthly_user_year_month;not null" json:"year"`
	Month         int            `gorm:"uniqueIndex:idx_monthly_user_year_month;not null" json:"month"` // 1-12
	Theme         string         `gorm:"type:text" json:"theme"`
	Goals         string         `gorm:"type:jsonb;default:'[]'" json:"goals"` // JSON array
	LifeScores    string         `gorm:"type:jsonb;default:'{}'" json:"life_scores"` // JSON object
	ReviewSummary string         `gorm:"type:text" json:"review_summary"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`
}
