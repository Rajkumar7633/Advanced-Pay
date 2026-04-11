package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/yourcompany/payment-gateway/internal/domain/models"
	"github.com/yourcompany/payment-gateway/internal/domain/service"
	"github.com/yourcompany/payment-gateway/pkg/logger"
)

type SubscriptionHandler struct {
	subService *service.SubscriptionService
	logger     *logger.Logger
}

func NewSubscriptionHandler(subService *service.SubscriptionService, logger *logger.Logger) *SubscriptionHandler {
	return &SubscriptionHandler{
		subService: subService,
		logger:     logger,
	}
}

// POST /api/v1/plans
func (h *SubscriptionHandler) CreatePlan(c *gin.Context) {
	merchantID := extractMerchantID(c)

	var req struct {
		Name          string  `json:"name" binding:"required"`
		Description   string  `json:"description"`
		Amount        float64 `json:"amount" binding:"required,gt=0"`
		Currency      string  `json:"currency" binding:"required"`
		IntervalType  string  `json:"interval_type" binding:"required,oneof=daily weekly monthly yearly"`
		IntervalCount int     `json:"interval_count" binding:"required,gt=0"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	plan, err := h.subService.CreatePlan(c.Request.Context(), merchantID, req.Name, req.Description, req.Amount, req.Currency, req.IntervalType, req.IntervalCount)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create plan"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": plan})
}

// GET /api/v1/plans
func (h *SubscriptionHandler) ListPlans(c *gin.Context) {
	merchantID := extractMerchantID(c)

	plans, err := h.subService.ListPlans(c.Request.Context(), merchantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list plans"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": plans})
}

// POST /api/v1/subscriptions
func (h *SubscriptionHandler) CreateSubscription(c *gin.Context) {
	merchantID := extractMerchantID(c)

	var req struct {
		PlanID        string                 `json:"plan_id" binding:"required,uuid"`
		CustomerEmail string                 `json:"customer_email" binding:"required,email"`
		CustomerPhone string                 `json:"customer_phone"`
		Metadata      map[string]interface{} `json:"metadata"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	planUUID, _ := uuid.Parse(req.PlanID)
	opts := models.CreateSubscriptionOptions{
		CustomerEmail: req.CustomerEmail,
		CustomerPhone: req.CustomerPhone,
		Metadata:      req.Metadata,
	}

	sub, err := h.subService.CreateSubscription(c.Request.Context(), merchantID, planUUID, opts)
	if err != nil {
		// Log detailed error internally, return generic
		h.logger.Error("Failed to create sub", "err", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Returning standard gateway URL requirement: User MUST authenticate mandate
	authURL := "https://checkout.yourgateway.com/upi/mandate/" + sub.ID.String()

	c.JSON(http.StatusCreated, gin.H{
		"data": sub,
		"auth_url": authURL,
		"message": "Subscription pending. Customer must authorize the RBI mandate.",
	})
}

// GET /api/v1/subscriptions
func (h *SubscriptionHandler) ListSubscriptions(c *gin.Context) {
	merchantID := extractMerchantID(c)

	subs, err := h.subService.ListSubscriptions(c.Request.Context(), merchantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list subscriptions"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": subs})
}

// DELETE /api/v1/subscriptions/:id
func (h *SubscriptionHandler) CancelSubscription(c *gin.Context) {
	merchantID := extractMerchantID(c)
	subID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid subscription id"})
		return
	}

	if err := h.subService.CancelSubscription(c.Request.Context(), merchantID, subID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to cancel subscription"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Subscription canceled successfully"})
}

func extractMerchantID(c *gin.Context) uuid.UUID {
	idStr := c.GetString("merchant_id")
	id, _ := uuid.Parse(idStr)
	return id
}
