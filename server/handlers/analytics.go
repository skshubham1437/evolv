package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"evolv-server/database"
	"evolv-server/models"
)

// GetAnalyticsSummary handles GET /api/analytics
func GetAnalyticsSummary(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)

	// Parse range query param: 7d, 30d, 90d, all
	rangeParam := r.URL.Query().Get("range")
	if rangeParam == "" {
		rangeParam = "7d"
	}

	var days int
	switch rangeParam {
	case "30d":
		days = 30
	case "90d":
		days = 90
	case "all":
		days = 365
	default:
		days = 7
	}

	now := time.Now()
	rangeAgo := now.AddDate(0, 0, -(days - 1))
	startOfToday := now.Truncate(24 * time.Hour)

	// ── 1. Productivity Trend: tasks completed per day over range ──
	var completedTasks []models.Task
	database.DB.Where("user_id = ? AND is_completed = ? AND updated_at >= ?", userID, true, rangeAgo).Find(&completedTasks)

	productivityTrend := make([]int, days)
	for _, task := range completedTasks {
		daysAgo := int(startOfToday.Sub(task.UpdatedAt.Truncate(24*time.Hour)).Hours() / 24)
		if daysAgo >= 0 && daysAgo < days {
			productivityTrend[(days-1)-daysAgo]++
		}
	}

	// ── 2. Time Allocation: derived from habit categories ──────────────
	thirtyDaysAgo := now.AddDate(0, 0, -30)

	var habits []models.Habit
	database.DB.Where("user_id = ?", userID).Find(&habits)

	habitCategoryMap := make(map[uint]string, len(habits))
	for _, h := range habits {
		habitCategoryMap[h.ID] = h.Category
	}

	var logs []models.HabitLog
	if len(habitCategoryMap) > 0 {
		ids := make([]uint, 0, len(habitCategoryMap))
		for id := range habitCategoryMap {
			ids = append(ids, id)
		}
		database.DB.Where("habit_id IN ? AND completed_at >= ?", ids, thirtyDaysAgo).Find(&logs)
	}

	bucketCounts := map[string]int{
		"deep_work": 0,
		"personal":  0,
		"health":    0,
	}
	for _, l := range logs {
		cat := habitCategoryMap[l.HabitID]
		switch cat {
		case "Health", "Fitness", "Wellness":
			bucketCounts["health"]++
		case "Creative", "Learning", "Personal":
			bucketCounts["personal"]++
		default:
			bucketCounts["deep_work"]++
		}
	}

	totalLogs := bucketCounts["deep_work"] + bucketCounts["personal"] + bucketCounts["health"]
	timeAllocation := map[string]int{
		"deep_work": 0,
		"personal":  0,
		"health":    0,
	}
	if totalLogs > 0 {
		timeAllocation["deep_work"] = (bucketCounts["deep_work"] * 100) / totalLogs
		timeAllocation["personal"] = (bucketCounts["personal"] * 100) / totalLogs
		timeAllocation["health"] = 100 - timeAllocation["deep_work"] - timeAllocation["personal"]
		if timeAllocation["health"] < 0 {
			timeAllocation["health"] = 0
		}
	} else {
		timeAllocation["deep_work"] = 34
		timeAllocation["personal"] = 33
		timeAllocation["health"] = 33
	}

	// ── 3. Momentum Score (0-100) ──────────────────────────────────────
	streakScore := 0
	if len(habits) > 0 {
		totalStreak := 0
		for _, h := range habits {
			totalStreak += h.Streak
		}
		avgStreak := float64(totalStreak) / float64(len(habits))
		streakScore = int((avgStreak / 30.0) * 60.0)
		if streakScore > 60 {
			streakScore = 60
		}
	}

	// Calculate 7-day productivity velocity for momentum
	var completedTasks7d []models.Task
	sevenDaysAgo := now.AddDate(0, 0, -6)
	database.DB.Where("user_id = ? AND is_completed = ? AND updated_at >= ?", userID, true, sevenDaysAgo).Find(&completedTasks7d)
	taskScore := (len(completedTasks7d) * 40) / 35
	if taskScore > 40 {
		taskScore = 40
	}

	momentumScore := streakScore + taskScore

	// ── 4. Mood vs. Productivity Correlation & Energy Heatmap ──
	correlationDays := days
	if correlationDays < 30 {
		correlationDays = 30
	}
	correlationAgo := now.AddDate(0, 0, -(correlationDays - 1))

	var journalEntries []models.JournalEntry
	database.DB.Where("user_id = ? AND date >= ?", userID, correlationAgo.Format("2006-01-02")).Find(&journalEntries)

	var correlationTasks []models.Task
	database.DB.Where("user_id = ? AND is_completed = ? AND updated_at >= ?", userID, true, correlationAgo).Find(&correlationTasks)

	taskCountsByDate := make(map[string]int)
	for _, t := range correlationTasks {
		dateStr := t.UpdatedAt.Format("2006-01-02")
		taskCountsByDate[dateStr]++
	}

	var correlationHabitLogs []models.HabitLog
	if len(habitCategoryMap) > 0 {
		ids := make([]uint, 0, len(habitCategoryMap))
		for id := range habitCategoryMap {
			ids = append(ids, id)
		}
		database.DB.Where("habit_id IN ? AND completed_at >= ?", ids, correlationAgo).Find(&correlationHabitLogs)
	}

	habitCountsByDate := make(map[string]int)
	for _, cl := range correlationHabitLogs {
		dateStr := cl.CompletedAt.Format("2006-01-02")
		habitCountsByDate[dateStr]++
	}

	// Calculate mood correlations
	moodSums := make(map[int]int)
	moodCounts := make(map[int]int)
	for _, entry := range journalEntries {
		m := entry.Mood
		if m < 1 { m = 3 }
		if m > 5 { m = 5 }

		completions := taskCountsByDate[entry.Date] + habitCountsByDate[entry.Date]
		moodSums[m] += completions
		moodCounts[m]++
	}

	type MoodCorrelationItem struct {
		Mood           int     `json:"mood"`
		AvgCompletions float64 `json:"avg_completions"`
	}
	moodProductivityCorrelation := make([]MoodCorrelationItem, 5)
	for m := 1; m <= 5; m++ {
		avg := 0.0
		if moodCounts[m] > 0 {
			avg = float64(moodSums[m]) / float64(moodCounts[m])
		}
		moodProductivityCorrelation[m-1] = MoodCorrelationItem{
			Mood:           m,
			AvgCompletions: avg,
		}
	}

	// Fetch actual energy logs in the range
	var energyLogs []models.EnergyLog
	database.DB.Where("user_id = ? AND logged_at >= ?", userID, rangeAgo).Find(&energyLogs)

	// Grid to accumulate actual logs
	actualGridSum := [7][8]float64{}
	actualGridCount := [7][8]int{}

	for _, el := range energyLogs {
		dayIdx := int(el.LoggedAt.Weekday() + 6) % 7 // Monday=0
		hIdx := getHourSlotIndex(el.LoggedAt)
		actualGridSum[dayIdx][hIdx] += float64(el.Energy) * 20.0 // 1-5 to 20-100
		actualGridCount[dayIdx][hIdx]++
	}

	// Simulated Energy heatmap grids (7 days x 8 hours)
	simulatedGridSum := [7][8]float64{}
	simulatedGridCount := [7][8]int{}

	hourSlots := []string{"08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"}
	factors := []float64{0.7, 1.0, 0.8, 0.5, 0.7, 0.9, 0.6, 0.3}
	daysOfWeek := []string{"Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"}

	for _, entry := range journalEntries {
		t, err := time.Parse("2006-01-02", entry.Date)
		if err != nil {
			continue
		}

		dayIdx := int(t.Weekday() + 6) % 7 // Monday=0, ..., Sunday=6
		energyVal := float64(entry.Energy)
		if energyVal < 1 { energyVal = 3 }
		if energyVal > 5 { energyVal = 5 }

		energyPct := energyVal * 20.0 // 1-5 to 20-100

		for hIdx := 0; hIdx < 8; hIdx++ {
			simulatedGridSum[dayIdx][hIdx] += energyPct * factors[hIdx]
			simulatedGridCount[dayIdx][hIdx]++
		}
	}

	type HeatmapItem struct {
		Day   string  `json:"day"`
		Hour  string  `json:"hour"`
		Value float64 `json:"value"`
	}

	energyHeatmap := []HeatmapItem{}
	for dIdx := 0; dIdx < 7; dIdx++ {
		for hIdx := 0; hIdx < 8; hIdx++ {
			var val float64
			if actualGridCount[dIdx][hIdx] > 0 {
				val = actualGridSum[dIdx][hIdx] / float64(actualGridCount[dIdx][hIdx])
			} else if simulatedGridCount[dIdx][hIdx] > 0 {
				val = simulatedGridSum[dIdx][hIdx] / float64(simulatedGridCount[dIdx][hIdx])
			} else {
				val = 60.0 * factors[hIdx]
			}
			energyHeatmap = append(energyHeatmap, HeatmapItem{
				Day:   daysOfWeek[dIdx],
				Hour:  hourSlots[hIdx],
				Value: val,
			})
		}
	}

	response := map[string]interface{}{
		"productivity_trend":            productivityTrend,
		"time_allocation":               timeAllocation,
		"momentum_score":                momentumScore,
		"habit_count":                   len(habits),
		"mood_productivity_correlation": moodProductivityCorrelation,
		"energy_heatmap":                energyHeatmap,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func getHourSlotIndex(loggedAt time.Time) int {
	hour := loggedAt.Hour()
	if hour < 9 {
		return 0 // 08:00
	} else if hour < 11 {
		return 1 // 10:00
	} else if hour < 13 {
		return 2 // 12:00
	} else if hour < 15 {
		return 3 // 14:00
	} else if hour < 17 {
		return 4 // 16:00
	} else if hour < 19 {
		return 5 // 18:00
	} else if hour < 21 {
		return 6 // 20:00
	} else {
		return 7 // 22:00
	}
}
