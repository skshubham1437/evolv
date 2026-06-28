package services

import (
	"testing"

	"evolv-server/models"
)

func TestValidateStack(t *testing.T) {
	tests := []struct {
		name    string
		habits  []models.Habit
		wantErr bool
	}{
		{
			name: "No stacks",
			habits: []models.Habit{
				{ID: 1, Title: "Habit 1", StackAfterID: nil},
				{ID: 2, Title: "Habit 2", StackAfterID: nil},
			},
			wantErr: false,
		},
		{
			name: "Valid stack chain",
			habits: []models.Habit{
				{ID: 1, Title: "Habit 1", StackAfterID: nil},
				{ID: 2, Title: "Habit 2", StackAfterID: ptr(uint(1))},
				{ID: 3, Title: "Habit 3", StackAfterID: ptr(uint(2))},
			},
			wantErr: false,
		},
		{
			name: "Self loop",
			habits: []models.Habit{
				{ID: 1, Title: "Habit 1", StackAfterID: ptr(uint(1))},
			},
			wantErr: true,
		},
		{
			name: "Circular reference",
			habits: []models.Habit{
				{ID: 1, Title: "Habit 1", StackAfterID: ptr(uint(2))},
				{ID: 2, Title: "Habit 2", StackAfterID: ptr(uint(1))},
			},
			wantErr: true,
		},
		{
			name: "Long circular reference",
			habits: []models.Habit{
				{ID: 1, Title: "Habit 1", StackAfterID: ptr(uint(2))},
				{ID: 2, Title: "Habit 2", StackAfterID: ptr(uint(3))},
				{ID: 3, Title: "Habit 3", StackAfterID: ptr(uint(1))},
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateStack(tt.habits)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateStack() error = %v, wantErr %t", err, tt.wantErr)
			}
		})
	}
}

func TestSortHabits(t *testing.T) {
	tests := []struct {
		name     string
		habits   []models.Habit
		expected []uint
	}{
		{
			name: "Sort without stacking",
			habits: []models.Habit{
				{ID: 2, Position: 2},
				{ID: 1, Position: 1},
			},
			expected: []uint{1, 2},
		},
		{
			name: "Sort with simple stack",
			habits: []models.Habit{
				{ID: 2, Position: 2},
				{ID: 1, Position: 1},
				{ID: 3, Position: 3, StackAfterID: ptr(uint(1))},
			},
			expected: []uint{1, 3, 2},
		},
		{
			name: "Sort with nested stack chain",
			habits: []models.Habit{
				{ID: 2, Position: 2},
				{ID: 3, Position: 3, StackAfterID: ptr(uint(2))},
				{ID: 1, Position: 1},
				{ID: 4, Position: 4, StackAfterID: ptr(uint(3))},
			},
			expected: []uint{1, 2, 3, 4},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			sorted := SortHabits(tt.habits)
			if len(sorted) != len(tt.expected) {
				t.Fatalf("SortHabits() length = %d, expected %d", len(sorted), len(tt.expected))
			}
			for i, h := range sorted {
				if h.ID != tt.expected[i] {
					t.Errorf("SortHabits() index %d: got ID %d, expected %d", i, h.ID, tt.expected[i])
				}
			}
		})
	}
}

func ptr(v uint) *uint {
	return &v
}
