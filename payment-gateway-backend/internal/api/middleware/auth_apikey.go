package middleware

import (
	"net/http"
	"strings"

	"time"

	"github.com/gin-gonic/gin"
	"github.com/yourcompany/payment-gateway/internal/domain/repository"
	"github.com/yourcompany/payment-gateway/internal/infrastructure/cache"
	"github.com/yourcompany/payment-gateway/pkg/logger"
)

func APIKeyAuth(merchantRepo repository.MerchantRepository, log *logger.Logger) gin.HandlerFunc {
	// Initialize high speed memory tier
	l1 := cache.GetL1Cache()

	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "API key required"})
			c.Abort()
			return
		}

		// Support "Bearer sk_..." or just "sk_..."
		apiKey := strings.TrimPrefix(authHeader, "Bearer ")
		apiKey = strings.TrimSpace(apiKey)

		if apiKey == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid API key format"})
			c.Abort()
			return
		}

		// In a real system, we'd hash the key and compare with the stored hash
		// For now, our repository method already handles the logic of finding the merchant by secret key
		// We'll pass the raw key to the repo which should handle the hashing if needed, 
		// but since we stored bcrypt hashes, we need to find the merchant first or use a faster lookup (like prefix)
		
		// Actually, our repository.GetMerchantBySecretKey needs a way to verifybcrypt.
		// Since bcrypt isn't searchable, we'd usually use a key ID or a prefix for fast lookup, then verify.
		// For this implementation, we'll assume the repo can find it (e.g. by prefix or ID if we added one)
		// but since we didn't add a key ID, I'll update the repo to handle a more efficient lookup if needed.
		
		// Fast L1 Cache hit
		if cachedVal, ok := l1.Get("apikey:" + apiKey); ok {
			parts := strings.Split(cachedVal, "|")
			if len(parts) == 2 {
				c.Set("merchant_id", parts[0])
				c.Set("environment", parts[1])
				c.Next()
				return
			}
		}

		merchant, env, err := merchantRepo.GetMerchantBySecretKey(c.Request.Context(), apiKey)
		if err != nil {
			log.Warn("Failed API key authentication", "error", err)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid API key"})
			c.Abort()
			return
		}

		// Store high speed L1 cache (15 minute TTL)
		l1.Set("apikey:"+apiKey, merchant.ID.String()+"|"+env, 15*time.Minute)

		// Inject merchant details into context
		c.Set("merchant_id", merchant.ID.String())
		c.Set("environment", env)
		
		c.Next()
	}
}
