package middleware

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/yourcompany/payment-gateway/internal/infrastructure/cache"
	"github.com/yourcompany/payment-gateway/pkg/logger"
)

// RateLimit implements a fixed-window rate limiter using Redis (or in-memory fallback).
// limits: maximum requests allowed per window.
// window: duration of the window (e.g., 1 minute).
func RateLimit(cacheClient cache.Client, limits int64, window time.Duration, log *logger.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Identify client by IP for public routes, or by Merchant ID if authenticated
		clientID := c.ClientIP()
		merchantID, exists := c.Get("merchant_id")
		if exists && merchantID != "ADMIN" {
			clientID = fmt.Sprintf("merchant_%v", merchantID)
		}

		// Keep track of global metrics using purely the current minute
		currentMinute := time.Now().Truncate(time.Minute).Unix()
		globalTPSKey := fmt.Sprintf("metrics:global_tps:%d", currentMinute)
		
		// Increment global TPS (fire and forget intentionally tight logic)
		_, _ = cacheClient.Incr(c.Request.Context(), globalTPSKey)
		_ = cacheClient.Expire(c.Request.Context(), globalTPSKey, 5*time.Minute)

		// Unique key for rate limiter
		rateKey := fmt.Sprintf("ratelimit:%s:%d", clientID, time.Now().Truncate(window).Unix())
		
		currentCount, err := cacheClient.Incr(c.Request.Context(), rateKey)
		if err != nil {
			log.Error("Rate limiter failed", "error", err)
			c.Next() // fail open
			return
		}

		if currentCount == 1 {
			_ = cacheClient.Expire(c.Request.Context(), rateKey, window)
		}

		if currentCount > limits {
			log.Warn("Rate limit exceeded", "client_ip", c.ClientIP(), "client_id", clientID)
			
			// Increment block counter
			blockKey := fmt.Sprintf("metrics:ratelimit_blocks:%d", currentMinute)
			_, _ = cacheClient.Incr(c.Request.Context(), blockKey)
			_ = cacheClient.Expire(c.Request.Context(), blockKey, 5*time.Minute)

			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": "Rate limit exceeded. Please try again later.",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}
