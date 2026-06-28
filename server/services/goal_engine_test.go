package services

import (
	"testing"

	"evolv-server/models"
)

func TestCalculateGoalProgress(t *testing.T) {
	tests := []struct {
		name     string
		krs      []models.KeyResult
		tasks    []models.Task
		expected int
	}{
		{
			name:     "Empty inputs",
			krs:      nil,
			tasks:    nil,
			expected: 0,
		},
		{
			name: "Only Key Results - half done",
			krs: []models.KeyResult{
				{IsDone: true},
				{IsDone: false},
			},
			tasks:    nil,
			expected: 50,
		},
		{
			name: "Only Tasks - one third done",
			krs:  nil,
			tasks: []models.Task{
				{IsCompleted: true},
				{IsCompleted: false},
				{IsCompleted: false},
			},
			expected: 33,
		},
		{
			name: "Mix of Key Results and Tasks - half done",
			krs: []models.KeyResult{
				{IsDone: true},
				{IsDone: false},
			},
			tasks: []models.Task{
				{IsCompleted: true},
				{IsCompleted: false},
			},
			expected: 50,
		},
		{
			name: "Mix of Key Results and Tasks - all done",
			krs: []models.KeyResult{
				{IsDone: true},
			},
			tasks: []models.Task{
				{IsCompleted: true},
			},
			expected: 100,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := CalculateGoalProgress(tt.krs, tt.tasks)
			if got != tt.expected {
				t.Errorf("CalculateGoalProgress() = %d, expected %d", got, tt.expected)
			}
		})
	}
}
