package services

import (
	"time"
)

// CalculateNextDueDate computes the next scheduled date based on the base date and recurrence rule.
func CalculateNextDueDate(baseDate time.Time, recurrence string) (time.Time, bool) {
	switch recurrence {
	case "daily":
		return baseDate.AddDate(0, 0, 1), true
	case "weekly":
		return baseDate.AddDate(0, 0, 7), true
	case "monthly":
		return baseDate.AddDate(0, 1, 0), true
	default:
		return time.Time{}, false
	}
}
