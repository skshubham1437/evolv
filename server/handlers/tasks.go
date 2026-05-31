package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"evolv-server/database"
	"evolv-server/models"
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
	var tasks []models.Task
	database.DB.Where("user_id = ? AND is_completed = ?", userID, false).Order("position asc, created_at desc").Find(&tasks)
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
	Tags         *string    `json:"tags"`
	Dependencies *string    `json:"dependencies"`
	Notes        *string    `json:"notes"`
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
	if req.Tags != nil {
		task.Tags = *req.Tags
	}
	if req.Dependencies != nil {
		task.Dependencies = *req.Dependencies
	}
	if req.Notes != nil {
		task.Notes = *req.Notes
	}

	database.DB.Save(&task)
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
	database.DB.Model(&task).Update("is_completed", true)
	respond(w, task)
}

func DeleteTask(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	id, _ := strconv.Atoi(r.PathValue("id"))
	database.DB.Where("id = ? AND user_id = ?", id, userID).Delete(&models.Task{})
	w.WriteHeader(http.StatusNoContent)
}
