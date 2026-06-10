package handlers

import (
	"os"
	"strings"
	"testing"
	"time"

	"evolv-server/database"
	"evolv-server/models"
	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func TestMain(m *testing.M) {
	// Initialize pure-Go sqlite in-memory database (CGO-free)
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		panic("failed to connect sqlite: " + err.Error())
	}

	// AutoMigrate the models for test database
	err = db.AutoMigrate(
		&models.User{},
		&models.Habit{},
		&models.HabitLog{},
		&models.Notification{},
		&models.Goal{},
		&models.KeyResult{},
		&models.Milestone{},
		&models.Task{},
		&models.QuarterlyObjective{},
		&models.EnergyLog{},
	)
	if err != nil {
		panic("failed to migrate models: " + err.Error())
	}

	database.DB = db

	os.Exit(m.Run())
}

func TestStreakShieldConsumption(t *testing.T) {
	// Begin transaction and swap global DB
	originalDB := database.DB
	tx := originalDB.Begin()
	defer func() {
		tx.Rollback()
		database.DB = originalDB
	}()
	database.DB = tx

	// 1. Create a test user
	user := models.User{
		Email:        "streaktest@evolv.me",
		PasswordHash: "xyz123xyz123",
		Name:         "Streak Tester",
		IsOnboarded:  true,
	}
	if err := tx.Create(&user).Error; err != nil {
		t.Fatalf("failed to create test user: %v", err)
	}

	// 2. Create a test habit
	habit := models.Habit{
		UserID:                 user.ID,
		Title:                  "Daily Meditation",
		Streak:                 5,
		StreakShieldActive:     true,
		StreakShieldsRemaining: 2,
		Frequency:              "daily",
	}
	if err := tx.Create(&habit).Error; err != nil {
		t.Fatalf("failed to create test habit: %v", err)
	}

	// Case 1: Logged today (no miss, streak preserved, shields intact)
	completedToday := time.Now().Truncate(24 * time.Hour).Add(10 * time.Hour)
	logToday := models.HabitLog{
		HabitID:     habit.ID,
		CompletedAt: completedToday,
	}
	if err := tx.Create(&logToday).Error; err != nil {
		t.Fatalf("failed to create log: %v", err)
	}

	validateHabitStreaks(user.ID)

	var h1 models.Habit
	if err := tx.First(&h1, habit.ID).Error; err != nil {
		t.Fatalf("failed to fetch habit: %v", err)
	}
	if h1.Streak != 5 {
		t.Errorf("Expected streak to remain 5, got %d", h1.Streak)
	}
	if h1.StreakShieldsRemaining != 2 {
		t.Errorf("Expected shields to remain 2, got %d", h1.StreakShieldsRemaining)
	}

	// Clean up logToday for next cases
	tx.Delete(&logToday)

	// Case 2: Logged 2 days ago (missed yesterday, 1 shield should be consumed, streak preserved)
	completedTwoDaysAgo := time.Now().AddDate(0, 0, -2).Truncate(24 * time.Hour).Add(10 * time.Hour)
	logTwoDaysAgo := models.HabitLog{
		HabitID:     habit.ID,
		CompletedAt: completedTwoDaysAgo,
	}
	if err := tx.Create(&logTwoDaysAgo).Error; err != nil {
		t.Fatalf("failed to create log: %v", err)
	}

	validateHabitStreaks(user.ID)

	var h2 models.Habit
	if err := tx.First(&h2, habit.ID).Error; err != nil {
		t.Fatalf("failed to fetch habit: %v", err)
	}
	if h2.Streak != 5 {
		t.Errorf("Expected streak to remain 5, got %d", h2.Streak)
	}
	if h2.StreakShieldsRemaining != 1 {
		t.Errorf("Expected shields to be 1 after yesterday miss, got %d", h2.StreakShieldsRemaining)
	}

	// Verify that a notification was generated for the shield activation
	var notifs []models.Notification
	if err := tx.Where("user_id = ? AND type = ?", user.ID, "habit_shield").Find(&notifs).Error; err != nil {
		t.Fatalf("failed to query notifications: %v", err)
	}
	if len(notifs) != 1 {
		t.Errorf("Expected 1 habit_shield notification, got %d", len(notifs))
	} else if !strings.Contains(notifs[0].Title, "Shield Activated") {
		t.Errorf("Expected notification title to contain 'Shield Activated', got %q", notifs[0].Title)
	}

	// Clean up notifications for next cases
	tx.Where("user_id = ?", user.ID).Delete(&models.Notification{})

	// Clean up logTwoDaysAgo for next cases
	tx.Delete(&logTwoDaysAgo)

	// Reset shield count to 2, streak to 5
	tx.Model(&habit).Updates(map[string]interface{}{
		"streak":                    5,
		"streak_shields_remaining": 2,
	})

	// Case 3: Logged 4 days ago (missed 3 days, only 2 shields, remaining missed = 1, streak resets, both shields consumed)
	completedFourDaysAgo := time.Now().AddDate(0, 0, -4).Truncate(24 * time.Hour).Add(10 * time.Hour)
	logFourDaysAgo := models.HabitLog{
		HabitID:     habit.ID,
		CompletedAt: completedFourDaysAgo,
	}
	if err := tx.Create(&logFourDaysAgo).Error; err != nil {
		t.Fatalf("failed to create log: %v", err)
	}

	validateHabitStreaks(user.ID)

	var h3 models.Habit
	if err := tx.First(&h3, habit.ID).Error; err != nil {
		t.Fatalf("failed to fetch habit: %v", err)
	}
	if h3.Streak != 0 {
		t.Errorf("Expected streak to reset to 0, got %d", h3.Streak)
	}
	if h3.StreakShieldsRemaining != 0 {
		t.Errorf("Expected shields to be 0 after exhaustion, got %d", h3.StreakShieldsRemaining)
	}
}
