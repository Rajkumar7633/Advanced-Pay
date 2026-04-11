package middleware

import (
	"bytes"
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/yourcompany/payment-gateway/internal/infrastructure/cache"
)

// responseBodyWriter is a custom gin.ResponseWriter that captures the response body
type responseBodyWriter struct {
	gin.ResponseWriter
	body *bytes.Buffer
}

func (w responseBodyWriter) Write(b []byte) (int, error) {
	w.body.Write(b)
	return w.ResponseWriter.Write(b)
}

func Idempotency(cacheClient cache.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		if cacheClient == nil {
			c.Next()
			return
		}

		idempotencyKey := c.GetHeader("Idempotency-Key")
		if idempotencyKey == "" {
			c.Next()
			return
		}

		key := fmt.Sprintf("idempotency:%s", idempotencyKey)
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()

		// 1. Check if the key exists in the cache
		exists, _ := cacheClient.Exists(ctx, key)
		if exists {
			cachedResponse, err := cacheClient.Get(ctx, key)
			if err == nil {
				// We found a cached response, return it
				c.Data(http.StatusOK, "application/json", []byte(cachedResponse))
				c.Abort()
				return
			}
		}

		// 2. Wrap the response writer to capture the response
		w := &responseBodyWriter{body: &bytes.Buffer{}, ResponseWriter: c.Writer}
		c.Writer = w

		// 3. Process the request
		c.Next()

		// 4. If request is successful, cache the response
		if c.Writer.Status() >= 200 && c.Writer.Status() < 300 {
			_ = cacheClient.Set(ctx, key, w.body.String(), 24*time.Hour)
		}
	}
}
