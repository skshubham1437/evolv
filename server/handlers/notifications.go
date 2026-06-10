package handlers

import (
	"net/http"
	"strconv"

	"evolv-server/database"
	"evolv-server/models"
)

// GetNotifications handles GET /api/notifications
// Supports optional page/limit pagination, and optional unread_only query parameter.
func GetNotifications(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)

	pageStr := r.URL.Query().Get("page")
	limitStr := r.URL.Query().Get("limit")
	unreadOnly := r.URL.Query().Get("unread_only") == "true"

	var notifications []models.Notification
	query := database.DB.Where("user_id = ?", userID).Order("created_at desc")

	if unreadOnly {
		query = query.Where("is_read = ?", false)
	}

	if pageStr != "" || limitStr != "" {
		page := 1
		limit := 10
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
			if limit > 100 {
				limit = 100
			}
		}
		offset := (page - 1) * limit

		var total int64
		countQuery := database.DB.Model(&models.Notification{}).Where("user_id = ?", userID)
		if unreadOnly {
			countQuery = countQuery.Where("is_read = ?", false)
		}
		countQuery.Count(&total)

		w.Header().Set("X-Total-Count", strconv.FormatInt(total, 10))
		w.Header().Set("X-Total-Pages", strconv.FormatInt((total+int64(limit)-1)/int64(limit), 10))
		w.Header().Set("X-Page", strconv.Itoa(page))
		w.Header().Set("X-Limit", strconv.Itoa(limit))

		query = query.Limit(limit).Offset(offset)
	}

	if err := query.Find(&notifications).Error; err != nil {
		http.Error(w, `{"error":"Failed to fetch notifications"}`, http.StatusInternalServerError)
		return
	}

	respond(w, notifications)
}

// MarkNotificationAsRead handles PUT /api/notifications/{id}/read
func MarkNotificationAsRead(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	id, _ := strconv.Atoi(r.PathValue("id"))

	var notif models.Notification
	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).First(&notif).Error; err != nil {
		http.Error(w, `{"error":"Notification not found"}`, http.StatusNotFound)
		return
	}

	if err := database.DB.Model(&notif).Update("is_read", true).Error; err != nil {
		http.Error(w, `{"error":"Failed to update notification"}`, http.StatusInternalServerError)
		return
	}

	respond(w, notif)
}

// MarkAllNotificationsAsRead handles PUT /api/notifications/read-all
func MarkAllNotificationsAsRead(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)

	if err := database.DB.Model(&models.Notification{}).Where("user_id = ? AND is_read = ?", userID, false).Update("is_read", true).Error; err != nil {
		http.Error(w, `{"error":"Failed to update notifications"}`, http.StatusInternalServerError)
		return
	}

	respond(w, map[string]string{"status": "ok"})
}
