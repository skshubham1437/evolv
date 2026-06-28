package services

import (
	"errors"
	"sort"

	"evolv-server/models"
)

var ErrCircularStack = errors.New("circular habit stacking dependency detected")

// ValidateStack checks for self-referencing and circular stacks of habits.
func ValidateStack(habits []models.Habit) error {
	adj := make(map[uint]uint)
	allIDs := make(map[uint]bool)

	for _, h := range habits {
		allIDs[h.ID] = true
		if h.StackAfterID != nil {
			if h.ID == *h.StackAfterID {
				return ErrCircularStack // self loop
			}
			adj[h.ID] = *h.StackAfterID
		}
	}

	// Cycle detection using DFS path tracking
	for startID := range allIDs {
		visited := make(map[uint]bool)
		curr := startID
		for {
			if visited[curr] {
				return ErrCircularStack // cycle found
			}
			visited[curr] = true

			next, hasNext := adj[curr]
			if !hasNext {
				break
			}
			curr = next
		}
	}

	return nil
}

// SortHabits orders habits chronologically by position, placing stacked habits directly after their parents.
func SortHabits(habits []models.Habit) []models.Habit {
	if len(habits) == 0 {
		return habits
	}

	// Separate base habits (no StackAfterID) from stacked ones
	var bases []models.Habit
	children := make(map[uint][]models.Habit)

	for _, h := range habits {
		if h.StackAfterID == nil {
			bases = append(bases, h)
		} else {
			children[*h.StackAfterID] = append(children[*h.StackAfterID], h)
		}
	}

	// Sort base habits by Position
	sort.Slice(bases, func(i, j int) bool {
		return bases[i].Position < bases[j].Position
	})

	// Sort children list for each parent by Position
	for parentID := range children {
		sort.Slice(children[parentID], func(i, j int) bool {
			return children[parentID][i].Position < children[parentID][j].Position
		})
	}

	var result []models.Habit
	var appendWithChildren func(models.Habit)

	appendWithChildren = func(h models.Habit) {
		result = append(result, h)
		// Recursively append all habits stacked directly after this one
		for _, child := range children[h.ID] {
			appendWithChildren(child)
		}
	}

	for _, base := range bases {
		appendWithChildren(base)
	}

	// Fallback for orphaned stacks in case of broken references
	if len(result) < len(habits) {
		appended := make(map[uint]bool)
		for _, h := range result {
			appended[h.ID] = true
		}
		for _, h := range habits {
			if !appended[h.ID] {
				result = append(result, h)
			}
		}
	}

	return result
}
