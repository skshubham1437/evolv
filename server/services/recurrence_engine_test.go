package services

import (
	"testing"
	"time"
)

func TestCalculateNextDueDate(t *testing.T) {
	baseTime := time.Date(2026, 6, 28, 9, 0, 0, 0, time.UTC)

	tests := []struct {
		name       string
		recurrence string
		expected   time.Time
		expectedOk bool
	}{
		{
			name:       "Daily recurrence",
			recurrence: "daily",
			expected:   time.Date(2026, 6, 29, 9, 0, 0, 0, time.UTC),
			expectedOk: true,
		},
		{
			name:       "Weekly recurrence",
			recurrence: "weekly",
			expected:   time.Date(2026, 7, 5, 9, 0, 0, 0, time.UTC),
			expectedOk: true,
		},
		{
			name:       "Monthly recurrence",
			recurrence: "monthly",
			expected:   time.Date(2026, 7, 28, 9, 0, 0, 0, time.UTC),
			expectedOk: true,
		},
		{
			name:       "Invalid recurrence",
			recurrence: "yearly",
			expected:   time.Time{},
			expectedOk: false,
		},
		{
			name:       "Empty recurrence",
			recurrence: "",
			expected:   time.Time{},
			expectedOk: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, ok := CalculateNextDueDate(baseTime, tt.recurrence)
			if ok != tt.expectedOk {
				t.Errorf("CalculateNextDueDate() ok = %t, expected %t", ok, tt.expectedOk)
			}
			if ok && !got.Equal(tt.expected) {
				t.Errorf("CalculateNextDueDate() got = %v, expected %v", got, tt.expected)
			}
		})
	}
}
