package handlers

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"evolv-server/database"
	"evolv-server/models"
	"evolv-server/services"
	"gorm.io/gorm"
)

// --- HABIT HANDLERS ---

func GetHabits(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	validateHabitStreaks(userID)

	pageStr := r.URL.Query().Get("page")
	limitStr := r.URL.Query().Get("limit")

	var habits []models.Habit
	query := database.DB.Where("user_id = ?", userID).Order("created_at desc")

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
		database.DB.Model(&models.Habit{}).Where("user_id = ?", userID).Count(&total)

		w.Header().Set("X-Total-Count", strconv.FormatInt(total, 10))
		w.Header().Set("X-Total-Pages", strconv.FormatInt((total+int64(limit)-1)/int64(limit), 10))
		w.Header().Set("X-Page", strconv.Itoa(page))
		w.Header().Set("X-Limit", strconv.Itoa(limit))

		query = query.Limit(limit).Offset(offset)
	}

	query.Find(&habits)

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

	// Delegate to pure StreakEngine
	result := services.EvaluateCompletion(habit.Streak, habit.StreakShieldActive, habit.StreakShieldsRemaining, loggedYesterday)

	database.DB.Model(&habit).Updates(map[string]interface{}{
		"streak":                    result.NewStreak,
		"streak_shields_remaining": result.ShieldsRemaining,
	})
	habit.Streak = result.NewStreak
	habit.StreakShieldsRemaining = result.ShieldsRemaining

	respond(w, habit)
}

func DeleteHabit(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	id, _ := strconv.Atoi(r.PathValue("id"))

	// Verify ownership first.
	var habit models.Habit
	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).First(&habit).Error; err != nil {
		http.Error(w, "Habit not found", http.StatusNotFound)
		return
	}

	// Delete HabitLogs first (not yet covered by DB-level CASCADE on existing data),
	// then delete the habit itself.
	database.DB.Transaction(func(tx *gorm.DB) error {
		tx.Where("habit_id = ?", habit.ID).Delete(&models.HabitLog{})
		return tx.Delete(&habit).Error
	})
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

// validateHabitStreaks checks all habit streaks for the given user and updates
// any that have lapsed (no log yesterday and no shield available).
//
// Race safety: acquires a PostgreSQL advisory lock scoped to this user_id so
// that two simultaneous requests (e.g. dashboard + habits page) cannot
// double-consume shields or double-reset streaks.
//
// Performance: fetches the last completed_at per habit in a single GROUP BY
// query instead of one query per habit.
//
// Integrity: streak shields protect the streak counter only. No synthetic
// HabitLog records are written — fake logs corrupt analytics.
func validateHabitStreaks(userID uint) {
	// Acquire a per-user advisory lock within this DB transaction if using PostgreSQL.
	// pg_try_advisory_xact_lock returns false immediately if another connection
	// already holds the lock, so we skip validation rather than block.
	if database.DB.Dialector.Name() == "postgres" {
		var acquired bool
		database.DB.Raw("SELECT pg_try_advisory_xact_lock(?)", int64(userID)).Scan(&acquired)
		if !acquired {
			// Another concurrent request is already running streak validation.
			return
		}
	}

	var userHabits []models.Habit
	database.DB.Where("user_id = ?", userID).Find(&userHabits)
	if len(userHabits) == 0 {
		return
	}

	// Batch: fetch the most recent log timestamp per habit in ONE query.
	type lastLogRow struct {
		HabitID      uint
		LastLoggedAt sqlTime
	}
	var lastLogs []lastLogRow

	habitIDs := make([]uint, len(userHabits))
	for i, h := range userHabits {
		habitIDs[i] = h.ID
	}
	database.DB.Raw(
		`SELECT habit_id, MAX(completed_at) AS last_logged_at
		   FROM habit_logs
		  WHERE habit_id IN ?
		  GROUP BY habit_id`,
		habitIDs,
	).Scan(&lastLogs)

	// Build a quick lookup: habitID → lastLoggedAt
	lastLogMap := make(map[uint]time.Time, len(lastLogs))
	for _, row := range lastLogs {
		lastLogMap[row.HabitID] = row.LastLoggedAt.Time
	}

	now := time.Now()
	for _, h := range userHabits {
		lastLogged, hasLog := lastLogMap[h.ID]

		if !hasLog {
			// Never logged — reset streak if somehow non-zero.
			if h.Streak > 0 {
				database.DB.Model(&h).Update("streak", 0)
			}
			continue
		}

		// Delegate to pure StreakEngine
		result := services.ValidateStreakState(h.Streak, h.StreakShieldActive, h.StreakShieldsRemaining, lastLogged, now)

		if result.NewStreak != h.Streak || result.ShieldsRemaining != h.StreakShieldsRemaining {
			database.DB.Model(&h).Updates(map[string]interface{}{
				"streak":                    result.NewStreak,
				"streak_shields_remaining": result.ShieldsRemaining,
			})

			if result.ShieldsExhausted && result.ShieldsUsed > 0 {
				_ = services.SendNotification(userID, "Streak Shields Exhausted", fmt.Sprintf("Your streak for '%s' was reset because you missed too many days, using up all %d shields.", h.Title, result.ShieldsUsed), "warning")
			} else if result.ShieldActivated && result.ShieldsUsed > 0 {
				_ = services.SendNotification(userID, "Streak Shield Activated", fmt.Sprintf("Your streak for '%s' was preserved using %d streak shield(s)!", h.Title, result.ShieldsUsed), "habit_shield")
			}
		}
	}
}

// sqlTime is a custom wrapper around time.Time that implements sql.Scanner and driver.Valuer interfaces.
// SQLite returns MAX(completed_at) raw queries as strings, whereas PostgreSQL yields time.Time directly.
// Implementing both Scanner and Valuer ensures GORM treats it as a custom database type instead of a relation.
type sqlTime struct {
	time.Time
}

func (st sqlTime) Value() (driver.Value, error) {
	return st.Time, nil
}

func (st *sqlTime) Scan(value interface{}) error {
	if value == nil {
		st.Time = time.Time{}
		return nil
	}
	switch v := value.(type) {
	case time.Time:
		st.Time = v
		return nil
	case string:
		// Print it if we need to debug, but parseSQLiteTime will do it
		t, err := parseSQLiteTime(v)
		if err != nil {
			return err
		}
		st.Time = t
		return nil
	case []byte:
		t, err := parseSQLiteTime(string(v))
		if err != nil {
			return err
		}
		st.Time = t
		return nil
	default:
		return fmt.Errorf("cannot scan %T into sqlTime: value=%v", value, value)
	}
}

func parseSQLiteTime(s string) (time.Time, error) {
	layouts := []string{
		"2006-01-02 15:04:05.999999999-07:00",
		"2006-01-02 15:04:05.999999999Z07:00",
		"2006-01-02 15:04:05.999999999",
		"2006-01-02 15:04:05-07:00",
		"2006-01-02 15:04:05Z07:00",
		"2006-01-02 15:04:05",
		"2006-01-02T15:04:05Z07:00",
		time.RFC3339,
		time.RFC3339Nano,
		"2006-01-02 15:04:05.999999999 -0700 MST",
		"2006-01-02 15:04:05 -0700 MST",
	}
	for _, l := range layouts {
		if t, err := time.Parse(l, s); err == nil {
			return t, nil
		}
	}
	return time.Time{}, fmt.Errorf("unable to parse time string: %q", s)
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
