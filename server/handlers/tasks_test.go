package handlers

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"
	"time"

	"evolv-server/database"
	"evolv-server/middleware"
	"evolv-server/models"
)

func TestRecurringTaskEngine(t *testing.T) {
	// 1. Setup SQLite transaction
	originalDB := database.DB
	tx := originalDB.Begin()
	defer func() {
		tx.Rollback()
		database.DB = originalDB
	}()
	database.DB = tx

	// Ensure the Task model is migrated in sqlite for tests
	if err := tx.AutoMigrate(&models.Task{}); err != nil {
		t.Fatalf("failed to migrate Task: %v", err)
	}

	// 2. Create test user
	user := models.User{
		Email:        "tasktest@evolv.me",
		PasswordHash: "secret12345",
		Name:         "Task Tester",
	}
	if err := tx.Create(&user).Error; err != nil {
		t.Fatalf("failed to create user: %v", err)
	}

	// 3. Create a daily recurring task
	today := time.Now().Truncate(24 * time.Hour)
	task := models.Task{
		UserID:      user.ID,
		Title:       "Meditate daily",
		Priority:    "medium",
		DueDate:     &today,
		Recurrence:  "daily",
		IsCompleted: false,
	}
	if err := tx.Create(&task).Error; err != nil {
		t.Fatalf("failed to create task: %v", err)
	}

	// 4. Trigger CompleteTask handler
	req := httptest.NewRequest(http.MethodPut, "/api/tasks/"+strconv.Itoa(int(task.ID))+"/complete", nil)
	// Inject route parameter "id" (Go 1.22 routing uses r.PathValue)
	req.SetPathValue("id", strconv.Itoa(int(task.ID)))
	
	// Inject authenticated context
	ctx := context.WithValue(req.Context(), middleware.UserIDKey, user.ID)
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()
	CompleteTask(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d. Body: %s", rr.Code, rr.Body.String())
	}

	// 5. Verify task is completed
	var completedTask models.Task
	if err := tx.First(&completedTask, task.ID).Error; err != nil {
		t.Fatalf("failed to fetch completed task: %v", err)
	}
	if !completedTask.IsCompleted {
		t.Errorf("expected original task to be marked completed")
	}

	// 6. Verify that a new task was spawned for tomorrow
	var spawnedTasks []models.Task
	if err := tx.Where("user_id = ? AND is_completed = ?", user.ID, false).Find(&spawnedTasks).Error; err != nil {
		t.Fatalf("failed to query incomplete tasks: %v", err)
	}

	if len(spawnedTasks) != 1 {
		t.Fatalf("expected 1 spawned task, got %d", len(spawnedTasks))
	}

	spawned := spawnedTasks[0]
	if spawned.Title != "Meditate daily" {
		t.Errorf("expected spawned title to match, got %q", spawned.Title)
	}
	if spawned.Recurrence != "daily" {
		t.Errorf("expected spawned recurrence to be 'daily', got %q", spawned.Recurrence)
	}
	if spawned.DueDate == nil {
		t.Fatalf("expected spawned task to have a due date")
	}

	expectedTomorrow := today.AddDate(0, 0, 1)
	if !spawned.DueDate.Equal(expectedTomorrow) {
		t.Errorf("expected spawned due date to be %v, got %v", expectedTomorrow, *spawned.DueDate)
	}
}
