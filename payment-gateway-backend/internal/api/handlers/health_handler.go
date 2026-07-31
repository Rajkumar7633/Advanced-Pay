package handlers

import (
	"context"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
	"github.com/yourcompany/payment-gateway/pkg/logger"
)

// HealthChecker defines the interface for health check dependencies
type HealthChecker interface {
	Check(ctx context.Context) error
	Name() string
}

// DatabaseHealthChecker checks database connectivity
type DatabaseHealthChecker struct {
	db *sqlx.DB
}

func NewDatabaseHealthChecker(db *sqlx.DB) *DatabaseHealthChecker {
	return &DatabaseHealthChecker{db: db}
}

func (h *DatabaseHealthChecker) Name() string {
	return "database"
}

func (h *DatabaseHealthChecker) Check(ctx context.Context) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	return h.db.PingContext(ctx)
}

// RedisHealthChecker checks Redis connectivity
type RedisHealthChecker struct {
	client interface{} // Accept any cache client type
}

func NewRedisHealthChecker(client interface{}) *RedisHealthChecker {
	return &RedisHealthChecker{client: client}
}

func (h *RedisHealthChecker) Name() string {
	return "redis"
}

func (h *RedisHealthChecker) Check(ctx context.Context) error {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	// Type assertion to handle different cache client implementations
	if cacheClient, ok := h.client.(interface {
		Set(ctx context.Context, key string, value interface{}, expiration time.Duration) error
		Get(ctx context.Context, key string) (string, error)
		Delete(ctx context.Context, key string) error
	}); ok {
		// Try to set and get a test key
		testKey := "health_check_test"
		testValue := "ok"

		if err := cacheClient.Set(ctx, testKey, testValue, 10*time.Second); err != nil {
			return err
		}

		val, err := cacheClient.Get(ctx, testKey)
		if err != nil {
			return err
		}

		if val != testValue {
			return fmt.Errorf("redis health check value mismatch")
		}

		// Clean up
		cacheClient.Delete(ctx, testKey)

		return nil
	}

	return fmt.Errorf("unsupported cache client type")
}

// ExternalServiceHealthChecker checks external service connectivity
type ExternalServiceHealthChecker struct {
	name     string
	endpoint string
}

func NewExternalServiceHealthChecker(name, endpoint string) *ExternalServiceHealthChecker {
	return &ExternalServiceHealthChecker{
		name:     name,
		endpoint: endpoint,
	}
}

func (h *ExternalServiceHealthChecker) Name() string {
	return h.name
}

func (h *ExternalServiceHealthChecker) Check(ctx context.Context) error {
	// Implement actual health check for external services
	// For now, return nil as a placeholder
	return nil
}

// HealthHandler handles health check requests
type HealthHandler struct {
	checkers []HealthChecker
	logger   *logger.Logger
}

func NewHealthHandler(logger *logger.Logger) *HealthHandler {
	return &HealthHandler{
		checkers: make([]HealthChecker, 0),
		logger:   logger,
	}
}

func (h *HealthHandler) AddChecker(checker HealthChecker) {
	h.checkers = append(h.checkers, checker)
}

// HealthCheckResponse represents the health check response
type HealthCheckResponse struct {
	Status    string                 `json:"status"`
	Timestamp string                 `json:"timestamp"`
	Version   string                 `json:"version"`
	Checks    map[string]CheckResult `json:"checks"`
}

// CheckResult represents the result of a single health check
type CheckResult struct {
	Status  string `json:"status"`
	Message string `json:"message,omitempty"`
	Latency int64  `json:"latency_ms,omitempty"`
}

// LivenessProbe returns simple liveness status
func (h *HealthHandler) LivenessProbe(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status": "healthy",
	})
}

// ReadinessProbe checks if the service is ready to accept traffic
func (h *HealthHandler) ReadinessProbe(c *gin.Context) {
	ctx := c.Request.Context()

	response := HealthCheckResponse{
		Status:    "healthy",
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Version:   "1.0.0",
		Checks:    make(map[string]CheckResult),
	}

	var wg sync.WaitGroup
	results := make(chan struct {
		name   string
		result CheckResult
	}, len(h.checkers))

	// Run all health checks in parallel
	for _, checker := range h.checkers {
		wg.Add(1)
		go func(checker HealthChecker) {
			defer wg.Done()

			start := time.Now()
			result := CheckResult{
				Status: "healthy",
			}

			err := checker.Check(ctx)
			latency := time.Since(start).Milliseconds()
			result.Latency = latency

			if err != nil {
				result.Status = "unhealthy"
				result.Message = err.Error()
				h.logger.Error("Health check failed", "component", checker.Name(), "error", err)
			}

			results <- struct {
				name   string
				result CheckResult
			}{checker.Name(), result}
		}(checker)
	}

	// Wait for all checks to complete
	go func() {
		wg.Wait()
		close(results)
	}()

	// Collect results
	for res := range results {
		response.Checks[res.name] = res.result
		if res.result.Status != "healthy" {
			response.Status = "unhealthy"
		}
	}

	statusCode := http.StatusOK
	if response.Status == "unhealthy" {
		statusCode = http.StatusServiceUnavailable
	}

	c.JSON(statusCode, response)
}

// DetailedHealthCheck provides detailed health information
func (h *HealthHandler) DetailedHealthCheck(c *gin.Context) {
	ctx := c.Request.Context()

	response := gin.H{
		"status":    "healthy",
		"timestamp": time.Now().UTC().Format(time.RFC3339),
		"version":   "1.0.0",
		"checks":    make(map[string]interface{}),
	}

	var wg sync.WaitGroup
	mu := sync.Mutex{}

	// Run all health checks in parallel
	for _, checker := range h.checkers {
		wg.Add(1)
		go func(checker HealthChecker) {
			defer wg.Done()

			start := time.Now()
			checkResult := gin.H{
				"status": "healthy",
			}

			err := checker.Check(ctx)
			latency := time.Since(start).Milliseconds()
			checkResult["latency_ms"] = latency

			if err != nil {
				checkResult["status"] = "unhealthy"
				checkResult["error"] = err.Error()
				h.logger.Error("Health check failed", "component", checker.Name(), "error", err)
			}

			mu.Lock()
			checks := response["checks"].(map[string]interface{})
			checks[checker.Name()] = checkResult
			if checkResult["status"] == "unhealthy" {
				response["status"] = "unhealthy"
			}
			mu.Unlock()
		}(checker)
	}

	wg.Wait()

	statusCode := http.StatusOK
	if response["status"] == "unhealthy" {
		statusCode = http.StatusServiceUnavailable
	}

	c.JSON(statusCode, response)
}

// StartupProbe checks if the service has started successfully
func (h *HealthHandler) StartupProbe(c *gin.Context) {
	// Similar to readiness but with more lenient timeouts
	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
	defer cancel()

	response := HealthCheckResponse{
		Status:    "healthy",
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Version:   "1.0.0",
		Checks:    make(map[string]CheckResult),
	}

	// Only check critical dependencies for startup
	for _, checker := range h.checkers {
		start := time.Now()
		result := CheckResult{
			Status: "healthy",
		}

		err := checker.Check(ctx)
		latency := time.Since(start).Milliseconds()
		result.Latency = latency

		if err != nil {
			result.Status = "unhealthy"
			result.Message = err.Error()
		}

		response.Checks[checker.Name()] = result

		// For startup, we can be more lenient
		if err != nil {
			// Log but don't fail startup for non-critical services
			h.logger.Warn("Startup check warning", "component", checker.Name(), "error", err)
		}
	}

	c.JSON(http.StatusOK, response)
}
