package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/yourcompany/payment-gateway/internal/domain/repository"
)

// MerchantMustBeActive ensures the JWT merchant exists and may use the dashboard/API (active or approved).
func MerchantMustBeActive(merchantRepo repository.MerchantRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		idStr := c.GetString("merchant_id")
		if idStr == "" {
			c.Next()
			return
		}
		mid, err := uuid.Parse(idStr)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid merchant"})
			c.Abort()
			return
		}
		m, err := merchantRepo.GetByID(c.Request.Context(), mid)
		if err != nil || m == nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "merchant not found"})
			c.Abort()
			return
		}
		if m.Status != "active" && m.Status != "approved" {
			c.JSON(http.StatusForbidden, gin.H{
				"error":  "account is not active",
				"code":   "MERCHANT_INACTIVE",
				"status": m.Status,
			})
			c.Abort()
			return
		}
		c.Next()
	}
}
