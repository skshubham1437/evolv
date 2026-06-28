package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"evolv-server/database"
	"evolv-server/models"
	"evolv-server/services"
	"gorm.io/gorm"
)

// --- TASK HELPER ---
func rescheduleOverdueTasks(userID uint) {
	startOfToday := time.Now().Truncate(24 * time.Hour)
	database.DB.Model(&models.Task{}).
		Where("user_id = ? AND is_completed = ? AND due_date IS NOT NULL AND due_date < ?", userID, false, startOfToday).
		Update("due_date", startOfToday)
}

// RescheduleOverdue moves all overdue incomplete tasks to today.
// Called on login to keep the task list current without user action.
func RescheduleOverdue(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	rescheduleOverdueTasks(userID)
	respond(w, map[string]string{"status": "ok"})
}

// --- TASK HANDLERS ---

func GetTasks(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	rescheduleOverdueTasks(userID)

	pageStr := r.URL.Query().Get("page")
	limitStr := r.URL.Query().Get("limit")

	var tasks []models.Task
	query := database.DB.Where("user_id = ? AND is_completed = ?", userID, false).Order("position asc, created_at desc")

	if pageStr != "" || limitStr != "" {
		page := 1
		limit := 10
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
			if limit > 100 {
				limit = 100 // cap limit
			}
		}
		offset := (page - 1) * limit

		var total int64
		database.DB.Model(&models.Task{}).Where("user_id = ? AND is_completed = ?", userID, false).Count(&total)

		w.Header().Set("X-Total-Count", strconv.FormatInt(total, 10))
		w.Header().Set("X-Total-Pages", strconv.FormatInt((total+int64(limit)-1)/int64(limit), 10))
		w.Header().Set("X-Page", strconv.Itoa(page))
		w.Header().Set("X-Limit", strconv.Itoa(limit))

		query = query.Limit(limit).Offset(offset)
	}

	query.Find(&tasks)
	respond(w, tasks)
}

func CreateTask(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	var task models.Task
	if err := json.NewDecoder(r.Body).Decode(&task); err != nil {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}
	if task.Title == "" {
		http.Error(w, "Title is required", http.StatusBadRequest)
		return
	}
	if task.Priority == "" {
		task.Priority = "medium"
	}
	task.UserID = userID
	database.DB.Create(&task)
	
	if task.GoalID != nil {
		UpdateGoalProgress(database.DB, *task.GoalID)
	}

	w.WriteHeader(http.StatusCreated)
	respond(w, task)
}

// updateTaskRequest defines only the fields that clients are allowed to modify
// via PATCH. This prevents overwriting of ID, UserID, CreatedAt, etc.
type updateTaskRequest struct {
	Title        *string    `json:"title"`
	Description  *string    `json:"description"`
	Priority     *string    `json:"priority"`
	DueDate      *time.Time `json:"due_date"`
	Position     *int       `json:"position"`
	ProjectID    *uint      `json:"project_id"`
	ParentTaskID *uint      `json:"parent_task_id"`
	GoalID       *uint      `json:"goal_id"`
	ObjectiveID  *uint      `json:"objective_id"`
	IsUrgent     *bool      `json:"is_urgent"`
	IsImportant  *bool      `json:"is_important"`
	Tags         *string    `json:"tags"`
	Dependencies *string    `json:"dependencies"`
	Notes        *string    `json:"notes"`
	Recurrence   *string    `json:"recurrence"`
}

func UpdateTask(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	id, _ := strconv.Atoi(r.PathValue("id"))
	var task models.Task
	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).First(&task).Error; err != nil {
		http.Error(w, "Task not found", http.StatusNotFound)
		return
	}

	var req updateTaskRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}

	oldGoalID := task.GoalID

	// Apply only the fields that were provided
	if req.Title != nil {
		task.Title = *req.Title
	}
	if req.Description != nil {
		task.Description = *req.Description
	}
	if req.Priority != nil {
		task.Priority = *req.Priority
	}
	if req.DueDate != nil {
		task.DueDate = req.DueDate
	}
	if req.Position != nil {
		task.Position = *req.Position
	}
	if req.ProjectID != nil {
		task.ProjectID = req.ProjectID
	}
	if req.ParentTaskID != nil {
		task.ParentTaskID = req.ParentTaskID
	}
	if req.GoalID != nil {
		if *req.GoalID == 0 {
			task.GoalID = nil
		} else {
			task.GoalID = req.GoalID
		}
	}
	if req.ObjectiveID != nil {
		if *req.ObjectiveID == 0 {
			task.ObjectiveID = nil
		} else {
			task.ObjectiveID = req.ObjectiveID
		}
	}
	if req.IsUrgent != nil {
		task.IsUrgent = *req.IsUrgent
	}
	if req.IsImportant != nil {
		task.IsImportant = *req.IsImportant
	}
	if req.Tags != nil {
		task.Tags = *req.Tags
	}
	if req.Dependencies != nil {
		task.Dependencies = *req.Dependencies
	}
	if req.Notes != nil {
		task.Notes = *req.Notes
	}
	if req.Recurrence != nil {
		task.Recurrence = *req.Recurrence
	}

	database.DB.Save(&task)

	if task.GoalID != nil {
		UpdateGoalProgress(database.DB, *task.GoalID)
	}
	if oldGoalID != nil && (task.GoalID == nil || *oldGoalID != *task.GoalID) {
		UpdateGoalProgress(database.DB, *oldGoalID)
	}

	respond(w, task)
}

func CompleteTask(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	id, _ := strconv.Atoi(r.PathValue("id"))
	var task models.Task
	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).First(&task).Error; err != nil {
		http.Error(w, "Task not found", http.StatusNotFound)
		return
	}

	if task.IsCompleted {
		respond(w, task)
		return
	}

	err := database.DB.Transaction(func(tx *gorm.DB) error {
		// Mark current task completed
		if err := tx.Model(&task).Update("is_completed", true).Error; err != nil {
			return err
		}

		// Update goal progress if associated
		if task.GoalID != nil {
			if err := UpdateGoalProgress(tx, *task.GoalID); err != nil {
				return err
			}
		}

		// If it's a recurring task, schedule the next occurrence
		if task.Recurrence != "" && task.DueDate != nil {
			nextDueDate, ok := services.CalculateNextDueDate(*task.DueDate, task.Recurrence)
			if !ok {
				return nil // no valid recurrence, do nothing
			}

			nextTask := models.Task{
				UserID:       task.UserID,
				ProjectID:    task.ProjectID,
				ParentTaskID: task.ParentTaskID,
				Title:        task.Title,
				Description:  task.Description,
				Priority:     task.Priority,
				DueDate:      &nextDueDate,
				Position:     task.Position,
				Tags:         task.Tags,
				Dependencies: task.Dependencies,
				Notes:        task.Notes,
				Recurrence:   task.Recurrence,
				IsCompleted:  false,
			}
			if err := tx.Create(&nextTask).Error; err != nil {
				return err
			}
		}
		return nil
	})

	if err != nil {
		http.Error(w, "Failed to complete task", http.StatusInternalServerError)
		return
	}

	respond(w, task)
}

func DeleteTask(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	id, _ := strconv.Atoi(r.PathValue("id"))
	
	var task models.Task
	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).First(&task).Error; err == nil {
		database.DB.Delete(&task)
		if task.GoalID != nil {
			UpdateGoalProgress(database.DB, *task.GoalID)
		}
	}
	w.WriteHeader(http.StatusNoContent)
}

// UpdateTaskPositions bulk-updates positions of tasks in a single database transaction.
func UpdateTaskPositions(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	
	var req struct {
		Positions []struct {
			ID       uint `json:"id"`
			Position int  `json:"position"`
		} `json:"positions"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}

	err := database.DB.Transaction(func(tx *gorm.DB) error {
		for _, item := range req.Positions {
			if err := tx.Model(&models.Task{}).
				Where("id = ? AND user_id = ?", item.ID, userID).
				Update("position", item.Position).Error; err != nil {
				return err
			}
		}
		return nil
	})

	if err != nil {
		http.Error(w, "Failed to update task positions", http.StatusInternalServerError)
		return
	}

	respond(w, map[string]string{"status": "ok"})
}

