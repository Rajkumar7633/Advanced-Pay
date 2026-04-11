package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// RBAC middleware enforces Role-Based Access Control
func RBAC(allowedRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get role from context (set by JWT auth)
		// For now, if no role is set, assume "owner" for backward compatibility
		role, exists := c.Get("merchant_role")
		if !exists {
			role = "owner" // Default to owner if logging in via primary merchant email
		}

		userRole, ok := role.(string)
		if !ok {
			c.JSON(http.StatusForbidden, gin.H{"error": "Invalid role type"})
			c.Abort()
			return
		}

		// Check if user's role is in the allowed list
		isAllowed := false
		for _, allowedRole := range allowedRoles {
			if userRole == allowedRole {
				isAllowed = true
				break
			}
		}

		if !isAllowed {
			c.JSON(http.StatusForbidden, gin.H{"error": "You do not have permission to perform this action"})
			c.Abort()
			return
		}

		c.Next()
	}
}
