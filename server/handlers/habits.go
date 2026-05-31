package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"evolv-server/database"
	"evolv-server/models"
)

// --- HABIT HANDLERS ---

func GetHabits(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	validateHabitStreaks(userID)
	var habits []models.Habit
	database.DB.Where("user_id = ?", userID).Order("created_at desc").Find(&habits)

	startOfDay := time.Now().Truncate(24 * time.Hour)

	// Batch query: fetch all of today's logs in one query instead of N+1
	habitIDs := make([]uint, len(habits))
	for i, h := range habits {
		habitIDs[i] = h.ID
	}

	completedMap := make(map[uint]bool)
	if len(habitIDs) > 0 {
		var todayLogs []models.HabitLog
		database.DB.Where("habit_id IN ? AND completed_at >= ?", habitIDs, startOfDay).Find(&todayLogs)
		for _, log := range todayLogs {
			completedMap[log.HabitID] = true
		}
	}

	habitsWithStatus := make([]HabitWithStatus, 0, len(habits))
	for _, h := range habits {
		habitsWithStatus = append(habitsWithStatus, HabitWithStatus{
			Habit:          h,
			CompletedToday: completedMap[h.ID],
		})
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
		"logs":            logs,
	})
}

func GetHabitsHeatmap(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)

	// Fetch all habits for this user
	var habits []models.Habit
	database.DB.Where("user_id = ?", userID).Find(&habits)

	type HeatmapDay struct {
		Date      string `json:"date"`
		Completed int    `json:"completed"`
		Total     int    `json:"total"`
		Active    bool   `json:"active"`
		Percent   int    `json:"percent"`
	}

	days := make([]HeatmapDay, 30)
	now := time.Now()

	if len(habits) == 0 {
		// Return 30 empty days
		for i := 0; i < 30; i++ {
			d := now.AddDate(0, 0, -29+i)
			days[i] = HeatmapDay{
				Date:      d.Format("2006-01-02"),
				Completed: 0,
				Total:     0,
				Active:    false,
				Percent:   0,
			}
		}
		respond(w, days)
		return
	}

	habitIDs := make([]uint, len(habits))
	for i, h := range habits {
		habitIDs[i] = h.ID
	}

	// Fetch all logs in the last 30 days (from 30 days ago at 00:00 to now)
	thirtyDaysAgoStart := now.AddDate(0, 0, -29).Truncate(24 * time.Hour)
	var logs []models.HabitLog
	database.DB.Where("habit_id IN ? AND completed_at >= ?", habitIDs, thirtyDaysAgoStart).Find(&logs)

	// Map to keep track of completed habit IDs per day string
	logsPerDay := make(map[string]map[uint]bool)
	for _, log := range logs {
		dayStr := log.CompletedAt.Format("2006-01-02")
		if _, exists := logsPerDay[dayStr]; !exists {
			logsPerDay[dayStr] = make(map[uint]bool)
		}
		logsPerDay[dayStr][log.HabitID] = true
	}

	for i := 0; i < 30; i++ {
		d := now.AddDate(0, 0, -29+i)
		dayStr := d.Format("2006-01-02")

		completedCount := 0
		if completedHabits, exists := logsPerDay[dayStr]; exists {
			completedCount = len(completedHabits)
		}

		totalCount := len(habits)
		percent := 0
		if totalCount > 0 {
			percent = int((float64(completedCount) / float64(totalCount)) * 100)
		}

		days[i] = HeatmapDay{
			Date:      dayStr,
			Completed: completedCount,
			Total:     totalCount,
			Active:    completedCount > 0,
			Percent:   percent,
		}
	}

	respond(w, days)
}

func GetRoutines(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	routineType := r.PathValue("type")
	var habits []models.Habit
	database.DB.Where("user_id = ? AND routine_type = ?", userID, routineType).Order("position asc").Find(&habits)

	startOfDay := time.Now().Truncate(24 * time.Hour)

	// Batch query instead of N+1
	habitIDs := make([]uint, len(habits))
	for i, h := range habits {
		habitIDs[i] = h.ID
	}

	completedMap := make(map[uint]bool)
	if len(habitIDs) > 0 {
		var todayLogs []models.HabitLog
		database.DB.Where("habit_id IN ? AND completed_at >= ?", habitIDs, startOfDay).Find(&todayLogs)
		for _, log := range todayLogs {
			completedMap[log.HabitID] = true
		}
	}

	habitsWithStatus := make([]HabitWithStatus, 0, len(habits))
	for _, h := range habits {
		habitsWithStatus = append(habitsWithStatus, HabitWithStatus{
			Habit:          h,
			CompletedToday: completedMap[h.ID],
		})
	}

	respond(w, habitsWithStatus)
}

// validateHabitStreaks checks all habit streaks for the given user and resets
// any that have been broken (no log yesterday and no shield available).
func validateHabitStreaks(userID uint) {
	var userHabits []models.Habit
	database.DB.Where("user_id = ?", userID).Find(&userHabits)

	startOfToday := time.Now().Truncate(24 * time.Hour)
	startOfYesterday := startOfToday.AddDate(0, 0, -1)

	for _, h := range userHabits {
		var lastLog models.HabitLog
		err := database.DB.Where("habit_id = ?", h.ID).Order("completed_at desc").First(&lastLog).Error
		if err != nil {
			if h.Streak > 0 {
				database.DB.Model(&h).Update("streak", 0)
			}
			continue
		}

		lastLogDay := lastLog.CompletedAt.Truncate(24 * time.Hour)

		if lastLogDay.Before(startOfYesterday) {
			daysMissed := int(startOfYesterday.Sub(lastLogDay).Hours() / 24)

			shieldsUsed := 0
			if h.StreakShieldActive && h.StreakShieldsRemaining > 0 {
				if h.StreakShieldsRemaining >= daysMissed {
					shieldsUsed = daysMissed
				} else {
					shieldsUsed = h.StreakShieldsRemaining
				}
			}

			remainingMissed := daysMissed - shieldsUsed

			if remainingMissed > 0 {
				database.DB.Model(&h).Updates(map[string]interface{}{
					"streak":                    0,
					"streak_shields_remaining": h.StreakShieldsRemaining - shieldsUsed,
				})
			} else if shieldsUsed > 0 {
				for i := 1; i <= shieldsUsed; i++ {
					protectedDay := lastLogDay.AddDate(0, 0, i)
					database.DB.Create(&models.HabitLog{
						HabitID:     h.ID,
						CompletedAt: protectedDay.Add(12 * time.Hour),
					})
				}
				database.DB.Model(&h).Updates(map[string]interface{}{
					"streak_shields_remaining": h.StreakShieldsRemaining - shieldsUsed,
				})
			}
		}
	}
}

// --- DAILY DASHBOARD HANDLER ---

func GetDailyDashboard(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	rescheduleOverdueTasks(userID)
	validateHabitStreaks(userID)
	var tasks []models.Task
	var habits []models.Habit

	todayStart := time.Now().Truncate(24 * time.Hour)
	todayEnd := todayStart.Add(24 * time.Hour)
	database.DB.Where("user_id = ? AND is_completed = ? AND (due_date IS NULL OR (due_date >= ? AND due_date < ?))", userID, false, todayStart, todayEnd).Order("priority desc, created_at asc").Find(&tasks)
	database.DB.Where("user_id = ?", userID).Order("streak desc").Find(&habits)

	startOfDay := time.Now().Truncate(24 * time.Hour)

	// Batch query instead of N+1
	habitIDs := make([]uint, len(habits))
	for i, h := range habits {
		habitIDs[i] = h.ID
	}

	completedMap := make(map[uint]bool)
	if len(habitIDs) > 0 {
		var todayLogs []models.HabitLog
		database.DB.Where("habit_id IN ? AND completed_at >= ?", habitIDs, startOfDay).Find(&todayLogs)
		for _, log := range todayLogs {
			completedMap[log.HabitID] = true
		}
	}

	habitsWithStatus := make([]HabitWithStatus, 0, len(habits))
	for _, h := range habits {
		habitsWithStatus = append(habitsWithStatus, HabitWithStatus{
			Habit:          h,
			CompletedToday: completedMap[h.ID],
		})
	}

	respond(w, map[string]interface{}{
		"tasks":  tasks,
		"habits": habitsWithStatus,
	})
}
