package handlers

import (
	"net/http"

	"evolv-server/services"
)

// GetBurnoutRisk handles GET /api/ai/burnout-risk
func GetBurnoutRisk(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)

	insight, err := services.GetBurnoutRiskInsight(r.Context(), userID)
	if err != nil {
		handleAIError(w, r, err, "failed to calculate risk")
		return
	}

	respond(w, insight)
}
