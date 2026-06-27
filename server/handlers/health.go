package handlers

import (
	"fmt"
	"net/http"
	"os"

	"evolv-server/database"
	"evolv-server/services"
)

// HealthCheck reports the server, DB status and whether AI is enabled.
func HealthCheck(w http.ResponseWriter, r *http.Request) {
	sqlDB, err := database.DB.DB()
	dbStatus := "ok"
	if err != nil || sqlDB.Ping() != nil {
		dbStatus = "error"
	}
	
	w.Header().Set("Content-Type", "application/json")
	if dbStatus == "error" {
		w.WriteHeader(http.StatusServiceUnavailable)
	} else {
		w.WriteHeader(http.StatusOK)
	}

	fmt.Fprintf(w, `{"status":"ok","db":%q,"app":"evolv","ai_enabled":%t,"vapid_public_key":%q}`, dbStatus, services.IsAIEnabled(), os.Getenv("VAPID_PUBLIC_KEY"))
}
