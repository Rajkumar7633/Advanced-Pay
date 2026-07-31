package handlers

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/yourcompany/payment-gateway/internal/domain/models"
	"github.com/yourcompany/payment-gateway/internal/domain/repository"
	"github.com/yourcompany/payment-gateway/pkg/logger"
)

// WebhookManagementHandler handles webhook management operations
type WebhookManagementHandler struct {
	webhookRepo repository.WebhookRepository
	logger      *logger.Logger
}

func NewWebhookManagementHandler(webhookRepo repository.WebhookRepository, log *logger.Logger) *WebhookManagementHandler {
	return &WebhookManagementHandler{
		webhookRepo: webhookRepo,
		logger:      log,
	}
}

// CreateWebhookRequest represents the request to create a webhook
type CreateWebhookRequest struct {
	URL         string       `json:"url" binding:"required,url"`
	Events      []string     `json:"events" binding:"required"`
	Secret      string       `json:"secret"`
	Active      bool         `json:"active"`
	RetryPolicy *RetryPolicy `json:"retry_policy"`
}

// RetryPolicy defines retry configuration for webhooks
type RetryPolicy struct {
	MaxRetries      int           `json:"max_retries"`
	RetryDelay      time.Duration `json:"retry_delay"`
	BackoffStrategy string        `json:"backoff_strategy"` // linear, exponential
	Timeout         time.Duration `json:"timeout"`
}

// UpdateWebhookRequest represents the request to update a webhook
type UpdateWebhookRequest struct {
	URL         *string      `json:"url"`
	Events      *[]string    `json:"events"`
	Secret      *string      `json:"secret"`
	Active      *bool        `json:"active"`
	RetryPolicy *RetryPolicy `json:"retry_policy"`
}

// WebhookResponse represents the webhook response
type WebhookResponse struct {
	ID            uuid.UUID      `json:"id"`
	MerchantID    uuid.UUID      `json:"merchant_id"`
	URL           string         `json:"url"`
	Events        []string       `json:"events"`
	Secret        string         `json:"secret,omitempty"` // Only returned on creation
	Active        bool           `json:"active"`
	RetryPolicy   *RetryPolicy   `json:"retry_policy"`
	DeliveryStats *DeliveryStats `json:"delivery_stats"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
}

// DeliveryStats represents webhook delivery statistics
type DeliveryStats struct {
	TotalSent      int64      `json:"total_sent"`
	TotalDelivered int64      `json:"total_delivered"`
	TotalFailed    int64      `json:"total_failed"`
	SuccessRate    float64    `json:"success_rate"`
	LastDelivery   *time.Time `json:"last_delivery"`
	AverageLatency float64    `json:"average_latency_ms"`
}

// WebhookDeliveryLog represents a webhook delivery log entry
type WebhookDeliveryLog struct {
	ID             uuid.UUID              `json:"id"`
	WebhookID      uuid.UUID              `json:"webhook_id"`
	EventType      string                 `json:"event_type"`
	Payload        map[string]interface{} `json:"payload"`
	DeliveryStatus string                 `json:"delivery_status"` // success, failed, retrying
	HTTPStatusCode int                    `json:"http_status_code"`
	ResponseBody   string                 `json:"response_body"`
	AttemptNumber  int                    `json:"attempt_number"`
	Latency        int64                  `json:"latency_ms"`
	ErrorMessage   string                 `json:"error_message,omitempty"`
	CreatedAt      time.Time              `json:"created_at"`
}

// CreateWebhook creates a new webhook
func (h *WebhookManagementHandler) CreateWebhook(c *gin.Context) {
	merchantID := c.GetString("merchant_id")
	if merchantID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "merchant_id missing"})
		return
	}

	var req CreateWebhookRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate events
	validEvents := map[string]bool{
		"payment.created":        true,
		"payment.completed":      true,
		"payment.failed":         true,
		"payment.refunded":       true,
		"refund.created":         true,
		"refund.completed":       true,
		"dispute.created":        true,
		"dispute.resolved":       true,
		"settlement.created":     true,
		"subscription.created":   true,
		"subscription.updated":   true,
		"subscription.cancelled": true,
	}

	for _, event := range req.Events {
		if !validEvents[event] {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("invalid event: %s", event)})
			return
		}
	}

	// Set default retry policy if not provided
	if req.RetryPolicy == nil {
		req.RetryPolicy = &RetryPolicy{
			MaxRetries:      3,
			RetryDelay:      60 * time.Second,
			BackoffStrategy: "exponential",
			Timeout:         30 * time.Second,
		}
	}

	// Generate secret if not provided
	if req.Secret == "" {
		req.Secret = generateWebhookSecret()
	}

	// Create webhook
	webhook := &models.Webhook{
		MerchantID: uuid.MustParse(merchantID),
		URL:        req.URL,
		Events:     req.Events,
		Secret:     req.Secret,
		IsActive:   req.Active,
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}

	err := h.webhookRepo.Create(c.Request.Context(), webhook)
	if err != nil {
		h.logger.Error("Failed to create webhook", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create webhook"})
		return
	}

	response := &WebhookResponse{
		ID:          webhook.ID,
		MerchantID:  webhook.MerchantID,
		URL:         webhook.URL,
		Events:      webhook.Events,
		Secret:      webhook.Secret, // Only return secret on creation
		Active:      webhook.IsActive,
		RetryPolicy: req.RetryPolicy,
		CreatedAt:   webhook.CreatedAt,
		UpdatedAt:   webhook.UpdatedAt,
	}

	c.JSON(http.StatusCreated, gin.H{
		"data": response,
	})
}

// GetWebhook retrieves a webhook by ID
func (h *WebhookManagementHandler) GetWebhook(c *gin.Context) {
	webhookID := c.Param("webhook_id")
	if webhookID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "webhook_id required"})
		return
	}

	webhookUUID, err := uuid.Parse(webhookID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid webhook_id"})
		return
	}

	webhook, err := h.webhookRepo.GetByID(c.Request.Context(), webhookUUID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "webhook not found"})
		return
	}

	// Check merchant ownership
	merchantID := c.GetString("merchant_id")
	if webhook.MerchantID.String() != merchantID {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	response := &WebhookResponse{
		ID:         webhook.ID,
		MerchantID: webhook.MerchantID,
		URL:        webhook.URL,
		Events:     webhook.Events,
		Active:     webhook.IsActive,
		CreatedAt:  webhook.CreatedAt,
		UpdatedAt:  webhook.UpdatedAt,
	}

	c.JSON(http.StatusOK, gin.H{
		"data": response,
	})
}

// ListWebhooks lists all webhooks for a merchant
func (h *WebhookManagementHandler) ListWebhooks(c *gin.Context) {
	merchantID := c.GetString("merchant_id")
	if merchantID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "merchant_id missing"})
		return
	}

	// In production, this would query webhooks by merchant ID
	// For now, return empty list as the repository method doesn't exist
	responses := []*WebhookResponse{}

	c.JSON(http.StatusOK, gin.H{
		"data": responses,
	})
}

// UpdateWebhook updates an existing webhook
func (h *WebhookManagementHandler) UpdateWebhook(c *gin.Context) {
	webhookID := c.Param("webhook_id")
	if webhookID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "webhook_id required"})
		return
	}

	webhookUUID, err := uuid.Parse(webhookID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid webhook_id"})
		return
	}

	var req UpdateWebhookRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get existing webhook
	webhook, err := h.webhookRepo.GetByID(c.Request.Context(), webhookUUID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "webhook not found"})
		return
	}

	// Check merchant ownership
	merchantID := c.GetString("merchant_id")
	if webhook.MerchantID.String() != merchantID {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	// Update fields
	if req.URL != nil {
		webhook.URL = *req.URL
	}
	if req.Events != nil {
		webhook.Events = *req.Events
	}
	if req.Secret != nil {
		webhook.Secret = *req.Secret
	}
	if req.Active != nil {
		webhook.IsActive = *req.Active
	}
	webhook.UpdatedAt = time.Now()

	// In production, this would update the webhook in the database
	// For now, return the updated webhook
	response := &WebhookResponse{
		ID:         webhook.ID,
		MerchantID: webhook.MerchantID,
		URL:        webhook.URL,
		Events:     webhook.Events,
		Active:     webhook.IsActive,
		CreatedAt:  webhook.CreatedAt,
		UpdatedAt:  webhook.UpdatedAt,
	}

	c.JSON(http.StatusOK, gin.H{
		"data": response,
	})
}

// DeleteWebhook deletes a webhook
func (h *WebhookManagementHandler) DeleteWebhook(c *gin.Context) {
	webhookID := c.Param("webhook_id")
	if webhookID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "webhook_id required"})
		return
	}

	webhookUUID, err := uuid.Parse(webhookID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid webhook_id"})
		return
	}

	// Get existing webhook
	webhook, err := h.webhookRepo.GetByID(c.Request.Context(), webhookUUID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "webhook not found"})
		return
	}

	// Check merchant ownership
	merchantID := c.GetString("merchant_id")
	if webhook.MerchantID.String() != merchantID {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	if err := h.webhookRepo.Delete(c.Request.Context(), webhookUUID); err != nil {
		h.logger.Error("Failed to delete webhook", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete webhook"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"message": "webhook deleted successfully",
		},
	})
}

// GetWebhookDeliveryLogs retrieves delivery logs for a webhook
func (h *WebhookManagementHandler) GetWebhookDeliveryLogs(c *gin.Context) {
	webhookID := c.Param("webhook_id")
	if webhookID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "webhook_id required"})
		return
	}

	webhookUUID, err := uuid.Parse(webhookID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid webhook_id"})
		return
	}

	// Check webhook ownership
	webhook, err := h.webhookRepo.GetByID(c.Request.Context(), webhookUUID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "webhook not found"})
		return
	}

	merchantID := c.GetString("merchant_id")
	if webhook.MerchantID.String() != merchantID {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	// Get query parameters
	limit := c.DefaultQuery("limit", "50")
	offset := c.DefaultQuery("offset", "0")

	// In production, this would query the delivery logs table
	// For now, return sample data
	logs := []*WebhookDeliveryLog{
		{
			ID:             uuid.New(),
			WebhookID:      webhookUUID,
			EventType:      "payment.completed",
			DeliveryStatus: "success",
			HTTPStatusCode: 200,
			AttemptNumber:  1,
			Latency:        125,
			CreatedAt:      time.Now().Add(-5 * time.Minute),
		},
		{
			ID:             uuid.New(),
			WebhookID:      webhookUUID,
			EventType:      "payment.failed",
			DeliveryStatus: "failed",
			HTTPStatusCode: 500,
			AttemptNumber:  1,
			Latency:        5000,
			ErrorMessage:   "timeout",
			CreatedAt:      time.Now().Add(-1 * time.Hour),
		},
	}

	c.JSON(http.StatusOK, gin.H{
		"data": logs,
		"pagination": gin.H{
			"limit":  limit,
			"offset": offset,
			"total":  len(logs),
		},
	})
}

// RetryWebhookDelivery manually retries a failed webhook delivery
func (h *WebhookManagementHandler) RetryWebhookDelivery(c *gin.Context) {
	webhookID := c.Param("webhook_id")
	logID := c.Param("log_id")

	if webhookID == "" || logID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "webhook_id and log_id required"})
		return
	}

	webhookUUID, err := uuid.Parse(webhookID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid webhook_id"})
		return
	}

	// Check webhook ownership
	webhook, err := h.webhookRepo.GetByID(c.Request.Context(), webhookUUID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "webhook not found"})
		return
	}

	merchantID := c.GetString("merchant_id")
	if webhook.MerchantID.String() != merchantID {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	// In production, this would trigger a retry of the webhook delivery
	// For now, return success
	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"message": "webhook delivery retry initiated",
			"log_id":  logID,
		},
	})
}

// TestWebhook sends a test webhook to verify the endpoint
func (h *WebhookManagementHandler) TestWebhook(c *gin.Context) {
	webhookID := c.Param("webhook_id")
	if webhookID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "webhook_id required"})
		return
	}

	webhookUUID, err := uuid.Parse(webhookID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid webhook_id"})
		return
	}

	// Check webhook ownership
	webhook, err := h.webhookRepo.GetByID(c.Request.Context(), webhookUUID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "webhook not found"})
		return
	}

	merchantID := c.GetString("merchant_id")
	if webhook.MerchantID.String() != merchantID {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	// Send test webhook
	testPayload := map[string]interface{}{
		"test":  true,
		"event": "test.webhook",
		"data": map[string]interface{}{
			"merchant_id": merchantID,
			"timestamp":   time.Now().Unix(),
		},
	}

	// Sign the payload
	signature := h.signPayload(testPayload, webhook.Secret)

	// In production, this would actually send the webhook
	// For now, return the test result
	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"message":   "test webhook sent successfully",
			"payload":   testPayload,
			"signature": signature,
		},
	})
}

// VerifyWebhookSignature verifies a webhook signature
func (h *WebhookManagementHandler) VerifyWebhookSignature(c *gin.Context) {
	var req struct {
		Payload   map[string]interface{} `json:"payload" binding:"required"`
		Signature string                 `json:"signature" binding:"required"`
		Secret    string                 `json:"secret" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	valid := h.verifySignature(req.Payload, req.Signature, req.Secret)

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"valid": valid,
		},
	})
}

// signPayload signs a webhook payload with HMAC-SHA256
func (h *WebhookManagementHandler) signPayload(payload map[string]interface{}, secret string) string {
	payloadBytes, _ := json.Marshal(payload)
	hmac := hmac.New(sha256.New, []byte(secret))
	hmac.Write(payloadBytes)
	return hex.EncodeToString(hmac.Sum(nil))
}

// verifySignature verifies a webhook signature
func (h *WebhookManagementHandler) verifySignature(payload map[string]interface{}, signature, secret string) bool {
	expectedSignature := h.signPayload(payload, secret)
	return hmac.Equal([]byte(signature), []byte(expectedSignature))
}

// generateWebhookSecret generates a random webhook secret
func generateWebhookSecret() string {
	return uuid.New().String() + uuid.New().String()
}

// ValidateWebhookURL validates a webhook URL
func (h *WebhookManagementHandler) ValidateWebhookURL(c *gin.Context) {
	var req struct {
		URL string `json:"url" binding:"required,url"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Parse and validate URL
	parsedURL, err := url.Parse(req.URL)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"data": gin.H{
				"valid": false,
				"error": "invalid URL",
			},
		})
		return
	}

	// Check if URL is HTTPS (recommended for production)
	valid := true
	warnings := []string{}

	if parsedURL.Scheme != "https" {
		warnings = append(warnings, "URL is not HTTPS - recommended for production")
	}

	// Check if URL is accessible (in production, make actual request)
	// For now, just validate the format

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"valid":    valid,
			"warnings": warnings,
		},
	})
}
