package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"evolv-server/database"
	"evolv-server/models"
)

// GetProjects returns all projects for the current user
func GetProjects(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	var projects []models.Project
	database.DB.Where("user_id = ?", userID).Order("created_at desc").Find(&projects)
	respond(w, projects)
}

// CreateProject creates a new project
func CreateProject(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	var project models.Project
	if err := json.NewDecoder(r.Body).Decode(&project); err != nil {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}
	if project.Title == "" {
		http.Error(w, "Title is required", http.StatusBadRequest)
		return
	}
	project.UserID = userID
	if project.Color == "" {
		project.Color = "#D2BBFF"
	}
	project.Status = "active"

	if err := database.DB.Create(&project).Error; err != nil {
		http.Error(w, "Failed to create project", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusCreated)
	respond(w, project)
}

// UpdateProject updates an existing project
func UpdateProject(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	id, _ := strconv.Atoi(r.PathValue("id"))
	
	var project models.Project
	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).First(&project).Error; err != nil {
		http.Error(w, "Project not found", http.StatusNotFound)
		return
	}

	var updates struct {
		Title       *string    `json:"title"`
		Description *string    `json:"description"`
		Color       *string    `json:"color"`
		Status      *string    `json:"status"`
		Deadline    *time.Time `json:"deadline"`
	}
	if err := json.NewDecoder(r.Body).Decode(&updates); err != nil {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}

	if updates.Title != nil {
		project.Title = *updates.Title
	}
	if updates.Description != nil {
		project.Description = *updates.Description
	}
	if updates.Color != nil {
		project.Color = *updates.Color
	}
	if updates.Status != nil {
		project.Status = *updates.Status
	}
	if updates.Deadline != nil {
		project.Deadline = updates.Deadline
	}

	database.DB.Save(&project)
	respond(w, project)
}

// DeleteProject deletes a project and unlinks its tasks
func DeleteProject(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	id, _ := strconv.Atoi(r.PathValue("id"))

	// Verify project ownership
	var project models.Project
	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).First(&project).Error; err != nil {
		http.Error(w, "Project not found", http.StatusNotFound)
		return
	}

	// Unlink tasks linked to this project
	database.DB.Model(&models.Task{}).Where("user_id = ? AND project_id = ?", userID, id).Update("project_id", nil)

	database.DB.Delete(&project)
	w.WriteHeader(http.StatusNoContent)
}
