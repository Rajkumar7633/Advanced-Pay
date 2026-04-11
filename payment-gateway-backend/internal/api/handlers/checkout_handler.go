package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/yourcompany/payment-gateway/internal/infrastructure/cache"
)

type CheckoutHandler struct {
	cache cache.Client
}

func NewCheckoutHandler(cacheClient cache.Client) *CheckoutHandler {
	return &CheckoutHandler{cache: cacheClient}
}

type CreateCheckoutSessionRequest struct {
	OrderID string `json:"order_id" binding:"required"`
}

type checkoutSessionPayload struct {
	MerchantID string    `json:"merchant_id"`
	OrderID    string    `json:"order_id"`
	CreatedAt  time.Time `json:"created_at"`
}

// CreateSession creates a short-lived checkout session token.
// Auth: merchant JWT (merchant_id in context).
func (h *CheckoutHandler) CreateSession(c *gin.Context) {
	if h.cache == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "cache unavailable"})
		return
	}

	var req CreateCheckoutSessionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	merchantID := c.GetString("merchant_id")
	if merchantID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "merchant_id missing"})
		return
	}

	token := uuid.New().String()
	payload := checkoutSessionPayload{
		MerchantID: merchantID,
		OrderID:    req.OrderID,
		CreatedAt:  time.Now(),
	}

	key := "checkout_session:" + token
	if err := h.cache.Set(c.Request.Context(), key, payload, 10*time.Minute); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create session"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"data": gin.H{
			"session_token": token,
			"expires_in":    int64((10 * time.Minute).Seconds()),
		},
	})
}
