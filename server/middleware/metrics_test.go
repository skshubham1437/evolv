package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestMetricsMiddleware(t *testing.T) {
	// Create a dummy handler that returns 200 OK
	dummyHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	})

	// Wrap the dummy handler with MetricsMiddleware
	metricsWrapped := MetricsMiddleware(dummyHandler)

	// Make a test request to /api/test
	req := httptest.NewRequest(http.MethodGet, "/api/test", nil)
	rr := httptest.NewRecorder()

	metricsWrapped.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected status %d, got %d", http.StatusOK, rr.Code)
	}

	// Make a test request to /metrics
	metricsHandler := MetricsHandler()
	reqMetrics := httptest.NewRequest(http.MethodGet, "/metrics", nil)
	rrMetrics := httptest.NewRecorder()

	metricsHandler.ServeHTTP(rrMetrics, reqMetrics)

	if rrMetrics.Code != http.StatusOK {
		t.Errorf("expected metrics endpoint to return %d, got %d", http.StatusOK, rrMetrics.Code)
	}
}
