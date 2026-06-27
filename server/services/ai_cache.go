package services

import (
	"crypto/md5"
	"encoding/hex"
	"fmt"
	"log/slog"
	"time"

	"evolv-server/database"
	"evolv-server/models"
)

// GetCachedAIResponse looks up a valid cache entry in the database
func GetCachedAIResponse(userID uint, featureType, cacheKey string) (string, bool) {
	// Calculate md5 hash of the cacheKey to keep lookup keys compact
	hasher := md5.New()
	hasher.Write([]byte(cacheKey))
	hashedKey := hex.EncodeToString(hasher.Sum(nil))

	var cacheEntry models.AICache
	err := database.DB.Where("user_id = ? AND feature_type = ? AND cache_key = ? AND expires_at > ?",
		userID, featureType, hashedKey, time.Now()).First(&cacheEntry).Error

	if err != nil {
		return "", false
	}

	slog.Debug("AI cache hit", "userID", userID, "featureType", featureType)
	return cacheEntry.ResponseText, true
}

// SaveCachedAIResponse stores a response in the database cache with an expiration time
func SaveCachedAIResponse(userID uint, featureType, cacheKey, responseText string, duration time.Duration) error {
	hasher := md5.New()
	hasher.Write([]byte(cacheKey))
	hashedKey := hex.EncodeToString(hasher.Sum(nil))

	// Delete any old cache for this user/feature to prevent database bloat
	database.DB.Where("user_id = ? AND feature_type = ?", userID, featureType).Delete(&models.AICache{})

	cacheEntry := models.AICache{
		UserID:       userID,
		FeatureType:  featureType,
		CacheKey:     hashedKey,
		ResponseText: responseText,
		ExpiresAt:    time.Now().Add(duration),
	}

	err := database.DB.Create(&cacheEntry).Error
	if err != nil {
		slog.Error("Failed to write to AI cache", "error", err)
		return err
	}

	slog.Debug("AI cache saved", "userID", userID, "featureType", featureType, "expiresIn", duration)
	return nil
}

// GenerateCacheKeyForBrief creates a deterministic hash for a user's morning brief state
func GenerateCacheKeyForBrief(userID uint, tasks []models.Task, habits []models.Habit) string {
	dateStr := time.Now().Format("2006-01-02")
	
	// Create hash signature of current tasks and habits state
	var stateSig string
	for _, t := range tasks {
		stateSig += fmt.Sprintf("t:%d:%t|", t.ID, t.IsCompleted)
	}
	for _, h := range habits {
		stateSig += fmt.Sprintf("h:%d:%d|", h.ID, h.Streak)
	}

	return fmt.Sprintf("brief:%d:%s:%s", userID, dateStr, stateSig)
}

// GenerateCacheKeyForBurnout creates a deterministic hash for a user's burnout assessment state
func GenerateCacheKeyForBurnout(userID uint, moodHistory []int, energyHistory []int, completionRate float64) string {
	dateStr := time.Now().Format("2006-01-02")
	return fmt.Sprintf("burnout:%d:%s:%v:%v:%.2f", userID, dateStr, moodHistory, energyHistory, completionRate)
}
