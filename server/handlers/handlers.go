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

func UpdateTask(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	id, _ := strconv.Atoi(r.PathValue("id"))
	var task models.Task
	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).First(&task).Error; err != nil {
		http.Error(w, "Task not found", http.StatusNotFound)
		return
	}
	if err := json.NewDecoder(r.Body).Decode(&task); err != nil {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}
	task.UserID = userID // prevent user_id override
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

// --- HABIT HANDLERS ---

func GetHabits(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	var habits []models.Habit
	database.DB.Where("user_id = ?", userID).Order("created_at desc").Find(&habits)
	
	startOfDay := time.Now().Truncate(24 * time.Hour)
	type HabitWithStatus struct {
		models.Habit
		CompletedToday bool `json:"completed_today"`
	}

	habitsWithStatus := make([]HabitWithStatus, 0, len(habits))
	for _, h := range habits {
		var log models.HabitLog
		completedToday := database.DB.Where("habit_id = ? AND completed_at >= ?", h.ID, startOfDay).First(&log).Error == nil
		habitsWithStatus = append(habitsWithStatus, HabitWithStatus{Habit: h, CompletedToday: completedToday})
	}

	respond(w, habitsWithStatus)
}

func CreateHabit(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	var habit models.Habit
	if err := json.NewDecoder(r.Body).Decode(&habit); err != nil {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}
	if habit.Title == "" {
		http.Error(w, "Title is required", http.StatusBadRequest)
		return
	}
	if habit.Frequency == "" {
		habit.Frequency = "daily"
	}
	if habit.Category == "" {
		habit.Category = "Health"
	}
	if habit.RoutineType == "" {
		habit.RoutineType = "none"
	}
	habit.UserID = userID
	if habit.StreakShieldActive {
		habit.StreakShieldsRemaining = 1
	} else {
		habit.StreakShieldsRemaining = 0
	}
	database.DB.Create(&habit)
	w.WriteHeader(http.StatusCreated)
	respond(w, habit)
}

func UpdateHabit(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	id, _ := strconv.Atoi(r.PathValue("id"))
	var habit models.Habit
	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).First(&habit).Error; err != nil {
		http.Error(w, "Habit not found", http.StatusNotFound)
		return
	}
	wasActive := habit.StreakShieldActive
	if err := json.NewDecoder(r.Body).Decode(&habit); err != nil {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}
	if habit.StreakShieldActive && !wasActive && habit.StreakShieldsRemaining == 0 {
		habit.StreakShieldsRemaining = 1
	} else if !habit.StreakShieldActive {
		habit.StreakShieldsRemaining = 0
	}
	habit.UserID = userID
	database.DB.Save(&habit)
	respond(w, habit)
}

func LogHabit(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	id, _ := strconv.Atoi(r.PathValue("id"))
	var habit models.Habit
	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).First(&habit).Error; err != nil {
		http.Error(w, "Habit not found", http.StatusNotFound)
		return
	}

	startOfToday := time.Now().Truncate(24 * time.Hour)

	// Prevent double-logging on the same day
	var existing models.HabitLog
	if err := database.DB.Where("habit_id = ? AND completed_at >= ?", id, startOfToday).First(&existing).Error; err == nil {
		http.Error(w, "Already logged today", http.StatusConflict)
		return
	}

	// Create the log entry
	habitLog := models.HabitLog{HabitID: uint(id), CompletedAt: time.Now()}
	database.DB.Create(&habitLog)

	// ── Streak logic ──────────────────────────────────────────────────
	// Check whether the habit was logged yesterday. If not, the chain is
	// broken and the streak resets to 1 (this log). If yes, increment.
	startOfYesterday := startOfToday.AddDate(0, 0, -1)
	var yesterdayLog models.HabitLog
	loggedYesterday := database.DB.Where(
		"habit_id = ? AND completed_at >= ? AND completed_at < ?",
		id, startOfYesterday, startOfToday,
	).First(&yesterdayLog).Error == nil

	newStreak := 1
	if loggedYesterday {
		newStreak = habit.Streak + 1
	} else if habit.StreakShieldActive && habit.StreakShieldsRemaining > 0 {
		// Consuming a streak protection shield!
		newStreak = habit.Streak + 1
		habit.StreakShieldsRemaining -= 1
	}

	// Reward consistency: every 7 consecutive completions, grant +1 shield if shields are active (max 3)
	if newStreak > 0 && newStreak%7 == 0 && habit.StreakShieldActive && habit.StreakShieldsRemaining < 3 {
		habit.StreakShieldsRemaining += 1
	}

	database.DB.Model(&habit).Updates(map[string]interface{}{
		"streak":                    newStreak,
		"streak_shields_remaining": habit.StreakShieldsRemaining,
	})
	habit.Streak = newStreak

	respond(w, habit)
}

func DeleteHabit(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	id, _ := strconv.Atoi(r.PathValue("id"))
	database.DB.Where("id = ? AND user_id = ?", id, userID).Delete(&models.Habit{})
	w.WriteHeader(http.StatusNoContent)
}

func GetHabitStats(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	id, _ := strconv.Atoi(r.PathValue("id"))

	// Verify ownership
	var habit models.Habit
	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).First(&habit).Error; err != nil {
		http.Error(w, "Habit not found", http.StatusNotFound)
		return
	}

	var logs []models.HabitLog
	thirtyDaysAgo := time.Now().AddDate(0, 0, -30)
	database.DB.Where("habit_id = ? AND completed_at >= ?", id, thirtyDaysAgo).Order("completed_at asc").Find(&logs)
	
	totalDays := 30
	completedDays := len(logs)
	consistencyPct := 0
	if completedDays > 0 {
		consistencyPct = int((float64(completedDays) / float64(totalDays)) * 100)
	}

	respond(w, map[string]interface{}{
		"consistency_pct": consistencyPct,
		"logs": logs,
	})
}

func GetRoutines(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	routineType := r.PathValue("type")
	var habits []models.Habit
	database.DB.Where("user_id = ? AND routine_type = ?", userID, routineType).Order("position asc").Find(&habits)
	
	startOfDay := time.Now().Truncate(24 * time.Hour)
	type HabitWithStatus struct {
		models.Habit
		CompletedToday bool `json:"completed_today"`
	}

	habitsWithStatus := make([]HabitWithStatus, 0, len(habits))
	for _, h := range habits {
		var log models.HabitLog
		completedToday := database.DB.Where("habit_id = ? AND completed_at >= ?", h.ID, startOfDay).First(&log).Error == nil
		habitsWithStatus = append(habitsWithStatus, HabitWithStatus{Habit: h, CompletedToday: completedToday})
	}

	respond(w, habitsWithStatus)
}

// --- DAILY DASHBOARD HANDLER ---

func GetDailyDashboard(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	rescheduleOverdueTasks(userID)
	var tasks []models.Task
	var habits []models.Habit

	database.DB.Where("user_id = ? AND is_completed = ?", userID, false).Order("priority desc, created_at asc").Find(&tasks)
	database.DB.Where("user_id = ?", userID).Order("streak desc").Find(&habits)

	startOfDay := time.Now().Truncate(24 * time.Hour)
	type HabitWithStatus struct {
		models.Habit
		CompletedToday bool `json:"completed_today"`
	}

	habitsWithStatus := make([]HabitWithStatus, 0, len(habits))
	for _, h := range habits {
		var log models.HabitLog
		completedToday := database.DB.Where("habit_id = ? AND completed_at >= ?", h.ID, startOfDay).First(&log).Error == nil
		habitsWithStatus = append(habitsWithStatus, HabitWithStatus{Habit: h, CompletedToday: completedToday})
	}

	respond(w, map[string]interface{}{
		"tasks":  tasks,
		"habits": habitsWithStatus,
	})
}

// --- HELPER ---

func respond(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}
