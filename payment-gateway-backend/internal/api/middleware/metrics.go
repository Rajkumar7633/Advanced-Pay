package middleware

import (
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/yourcompany/payment-gateway/internal/infrastructure/metrics"
)

func PrometheusMetrics() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		method := c.Request.Method

		// Process request
		c.Next()

		// Record metrics after request is processed
		duration := time.Since(start).Seconds()
		status := strconv.Itoa(c.Writer.Status())

		metrics.RecordHTTPRequest(method, path, status, duration)
	}
}
