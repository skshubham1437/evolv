package services

import (
	"evolv-server/models"
)

// CalculateGoalProgress calculates the progress of a Goal based on its associated Key Results and Tasks.
func CalculateGoalProgress(krs []models.KeyResult, tasks []models.Task) int {
	totalItems := len(krs) + len(tasks)
	if totalItems == 0 {
		return 0
	}

	doneItems := 0
	for _, kr := range krs {
		if kr.IsDone {
			doneItems++
		}
	}
	for _, t := range tasks {
		if t.IsCompleted {
			doneItems++
		}
	}

	return (doneItems * 100) / totalItems
}
