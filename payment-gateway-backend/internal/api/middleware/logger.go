package middleware

import (
	"time"

	"github.com/gin-gonic/gin"
	"github.com/yourcompany/payment-gateway/pkg/logger"
)

func RequestLogger(log *logger.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		method := c.Request.Method

		c.Next()

		duration := time.Since(start)
		status := c.Writer.Status()

		log.Info("HTTP Request",
			"method", method,
			"path", path,
			"status", status,
			"duration_ms", duration.Milliseconds(),
		)
	}
}
