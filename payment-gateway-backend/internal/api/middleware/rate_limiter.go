package middleware

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/yourcompany/payment-gateway/internal/infrastructure/cache"
)

func RateLimiter(cacheClient cache.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		if cacheClient == nil {
			c.Next()
			return
		}

		ip := c.ClientIP()
		key := fmt.Sprintf("rate_limit:%s", ip)

		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()

		count, err := cacheClient.Incr(ctx, key)
		if err != nil {
			c.Next()
			return
		}

		if count == 1 {
			_ = cacheClient.Expire(ctx, key, 60*time.Second)
		}

		if count > 1000 {
			c.JSON(http.StatusTooManyRequests, gin.H{"error": "Rate limit exceeded"})
			c.Abort()
			return
		}

		c.Next()
	}
}
