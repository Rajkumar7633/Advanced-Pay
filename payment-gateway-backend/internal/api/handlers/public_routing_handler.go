package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/yourcompany/payment-gateway/internal/domain/service"
	"github.com/yourcompany/payment-gateway/internal/infrastructure/cache"
)

type PublicRoutingHandler struct {
	routing *service.RoutingService
	cache   cache.Client
}

func NewPublicRoutingHandler(routing *service.RoutingService, cacheClient cache.Client) *PublicRoutingHandler {
	return &PublicRoutingHandler{routing: routing, cache: cacheClient}
}

type publicRoutingDecision struct {
	Lane       string  `json:"lane"`
	Confidence float64 `json:"confidence"`
}

func (h *PublicRoutingHandler) GetDecision(c *gin.Context) {
	if h.cache == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "cache unavailable"})
		return
	}

	sessionToken := c.Query("session_token")
	if sessionToken == "" {
		sessionToken = c.GetHeader("X-Checkout-Session")
	}
	if sessionToken == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "session_token required"})
		return
	}

	// Validate session
	key := "checkout_session:" + sessionToken
	raw, err := h.cache.Get(c.Request.Context(), key)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired session"})
		return
	}
	// Ensure payload is valid JSON (we don't currently use fields, but this prevents trivial cache poisoning)
	var payload map[string]interface{}
	if err := json.Unmarshal([]byte(raw), &payload); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid session"})
		return
	}

	amountStr := c.Query("amount")
	method := c.Query("method")
	amount, _ := strconv.ParseFloat(amountStr, 64)

	decision := h.routing.Decide(amount, method, false)

	// Sanitized response: do not expose internal providers/factors.
	c.JSON(http.StatusOK, gin.H{
		"data": publicRoutingDecision{
			Lane:       laneFromProvider(decision.Provider),
			Confidence: decision.Confidence,
		},
	})
}

func laneFromProvider(provider string) string {
	// keep coarse labels only
	if provider == "upi_fast_lane" || provider == "upi_fast_lane_high_value" {
		return "upi"
	}
	if provider == "card_3ds_lane" || provider == "card_3ds_lane_high_value" {
		return "card"
	}
	return "standard"
}
