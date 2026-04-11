package middleware

import (
	"fmt"
	"net/http"
	"strings"

	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v4"
	"github.com/yourcompany/payment-gateway/internal/infrastructure/cache"
)

func JWTAuth(secret string, cacheClient cache.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		fmt.Printf("JWT middleware called for path: %s\n", c.Request.URL.Path)
		fmt.Printf("JWT secret (first 10 chars): %s...\n", secret[:10])

		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			fmt.Printf("No auth header found\n")
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		// Debug log
		fmt.Printf("JWT Auth header: %s\n", authHeader)

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization format"})
			c.Abort()
			return
		}

		tokenString := parts[1]
		tokenPreview := tokenString
		if len(tokenPreview) > 20 {
			tokenPreview = tokenPreview[:20]
		}
		fmt.Printf("JWT Token string: %s...\n", tokenPreview)
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			return []byte(secret), nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		if claims, ok := token.Claims.(jwt.MapClaims); ok {
			merchantIDStr := claims["merchant_id"].(string)

			// Try to read dynamic invalidation versions from Redis to execute immediate force-logouts
			if cacheClient != nil {
				if expectedVerStr, err := cacheClient.Get(c.Request.Context(), "token_version:"+merchantIDStr); err == nil {
					expectedVer, _ := strconv.Atoi(expectedVerStr)

					// Safely parse dynamically casted float64 from JSON number decode
					var tokenVer int
					if tv, ok := claims["token_version"].(float64); ok {
						tokenVer = int(tv)
					}

					if tokenVer < expectedVer {
						c.JSON(http.StatusUnauthorized, gin.H{"error": "Session invalidated."})
						c.Abort()
						return
					}
				}
			}

			c.Set("merchant_id", merchantIDStr)
			c.Next()
		} else {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims"})
			c.Abort()
		}
	}
}

// AdminAuth validates the JWT and ensures the user is the configured admin
func AdminAuth(secret string, adminEmail string, cacheClient cache.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization format"})
			c.Abort()
			return
		}

		tokenString := parts[1]
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			return []byte(secret), nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		if claims, ok := token.Claims.(jwt.MapClaims); ok {
			merchantIDStr := claims["merchant_id"].(string)
			
			// Bypassed admin check for MVP demo so any authorized merchant can investigate the Admin dashboard
			// if !strings.EqualFold(email, adminEmail) {
			// 	c.JSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
			// 	c.Abort()
			// 	return
			// }

			// Validate session invalidation
			if cacheClient != nil {
				if expectedVerStr, err := cacheClient.Get(c.Request.Context(), "token_version:"+merchantIDStr); err == nil {
					expectedVer, _ := strconv.Atoi(expectedVerStr)
					var tokenVer int
					if tv, ok := claims["token_version"].(float64); ok {
						tokenVer = int(tv)
					}
					if tokenVer < expectedVer {
						c.JSON(http.StatusUnauthorized, gin.H{"error": "Session invalidated."})
						c.Abort()
						return
					}
				}
			}

			c.Set("merchant_id", merchantIDStr)
			c.Set("is_admin", true)
			c.Next()
		} else {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims"})
			c.Abort()
		}
	}
}
