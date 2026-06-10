package middleware

import (
	"net/http"
	"strconv"
	"time"

	"evolv-server/database"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
	httpRequestsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "http_requests_total",
			Help: "Total number of HTTP requests processed.",
		},
		[]string{"method", "path", "status"},
	)

	httpRequestDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "http_request_duration_seconds",
			Help:    "Latency of HTTP requests in seconds.",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"method", "path", "status"},
	)

	dbOpenConnections = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "db_open_connections",
			Help: "Number of open database connections.",
		},
	)

	dbInUseConnections = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "db_in_use_connections",
			Help: "Number of database connections in use.",
		},
	)

	dbIdleConnections = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "db_idle_connections",
			Help: "Number of idle database connections.",
		},
	)
)

// MetricsHandler returns the HTTP handler for the Prometheus metrics endpoint.
func MetricsHandler() http.Handler {
	return promhttp.Handler()
}

// MetricsMiddleware tracks HTTP request count and latency.
func MetricsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Skip metrics/health routes to keep metrics clean.
		if r.URL.Path == "/metrics" || r.URL.Path == "/health" {
			next.ServeHTTP(w, r)
			return
		}

		wrapped := &responseWriterWrapper{
			ResponseWriter: w,
			statusCode:     http.StatusOK, // default StatusOK
		}

		next.ServeHTTP(wrapped, r)

		duration := time.Since(start).Seconds()
		statusStr := strconv.Itoa(wrapped.statusCode)

		// Record metrics
		httpRequestsTotal.WithLabelValues(r.Method, r.URL.Path, statusStr).Inc()
		httpRequestDuration.WithLabelValues(r.Method, r.URL.Path, statusStr).Observe(duration)
	})
}

// StartDBMetricsCollection polls database connection pool statistics periodically.
func StartDBMetricsCollection(interval time.Duration) {
	go func() {
		for {
			time.Sleep(interval)
			if database.DB != nil {
				sqlDB, err := database.DB.DB()
				if err == nil {
					stats := sqlDB.Stats()
					dbOpenConnections.Set(float64(stats.OpenConnections))
					dbInUseConnections.Set(float64(stats.InUse))
					dbIdleConnections.Set(float64(stats.Idle))
				}
			}
		}
	}()
}
