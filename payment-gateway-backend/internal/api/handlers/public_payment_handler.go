package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/yourcompany/payment-gateway/internal/domain/models"
	"github.com/yourcompany/payment-gateway/internal/domain/repository"
	"github.com/yourcompany/payment-gateway/internal/domain/service"
	"github.com/yourcompany/payment-gateway/internal/infrastructure/cache"
)

type PublicPaymentHandler struct {
	payments  *service.PaymentService
	adminRepo repository.AdminRepository
	cache     cache.Client
}

func NewPublicPaymentHandler(payments *service.PaymentService, adminRepo repository.AdminRepository, cacheClient cache.Client) *PublicPaymentHandler {
	return &PublicPaymentHandler{payments: payments, adminRepo: adminRepo, cache: cacheClient}
}

type checkoutSessionPayloadV1 struct {
	MerchantID string `json:"merchant_id"`
	OrderID    string `json:"order_id"`
}

func (h *PublicPaymentHandler) InitiatePayment(c *gin.Context) {
	merchantID := c.GetString("merchant_id")
	mid, err := uuid.Parse(merchantID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid authentication context"})
		return
	}

	if h.adminRepo != nil {
		if settings, err := h.adminRepo.GetSettings(c.Request.Context()); err == nil && settings.MaintenanceMode {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Payment gateway is currently under maintenance"})
			return
		}
	}

	var req models.CreatePaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.payments.CreatePayment(c.Request.Context(), &req, mid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to initiate payment"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": resp})
}

func (h *PublicPaymentHandler) CreatePayment(c *gin.Context) {
	payload, err := h.getSessionPayload(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	merchantUUID, err := uuid.Parse(payload.MerchantID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid session"})
		return
	}

	if h.adminRepo != nil {
		if settings, err := h.adminRepo.GetSettings(c.Request.Context()); err == nil && settings.MaintenanceMode {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Payment gateway is currently under maintenance"})
			return
		}
	}

	var req models.CreatePaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Enforce session order_id if present
	if payload.OrderID != "" {
		req.OrderID = payload.OrderID
	}

	resp, err := h.payments.CreatePayment(c.Request.Context(), &req, merchantUUID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create payment"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": resp})
}

func (h *PublicPaymentHandler) GetPaymentStatus(c *gin.Context) {
	payload, err := h.getSessionPayload(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	merchantUUID, err := uuid.Parse(payload.MerchantID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid session"})
		return
	}

	txID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid transaction ID"})
		return
	}

	tx, err := h.payments.GetPayment(c.Request.Context(), txID, merchantUUID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Transaction not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": gin.H{
		"id":     tx.ID.String(),
		"status": tx.Status,
	}})
}

func (h *PublicPaymentHandler) GetCheckoutIntent(c *gin.Context) {
	payload, err := h.getSessionPayload(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	// In a real implementation, we would fetch transaction details based on the session
	// For this SDK bridge, we return the structured intent data
	
	intentData := gin.H{
		"session_id": c.Query("session_token"),
		"merchant_id": payload.MerchantID,
		"order_id":    payload.OrderID,
		"currency":    "INR",
		"sdk_version": "1.0.0-india-first",
		"intents": gin.H{
			"upi": gin.H{
				"intent_url": fmt.Sprintf("upi://pay?pa=pay@advancedpay&pn=Advanced%%20Pay&am=0.00&cu=INR&tr=%s", payload.OrderID),
				"supported_apps": []string{"gpay", "phonepe", "paytm", "bhim"},
			},
			"card": gin.H{
				"public_key": "apk_live_51P...encryption_key", // Mock public key for client-side encryption
			},
		},
	}

	c.JSON(http.StatusOK, gin.H{"data": intentData})
}

func (h *PublicPaymentHandler) ConfirmPayment(c *gin.Context) {
	payload, err := h.getSessionPayload(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	merchantUUID, err := uuid.Parse(payload.MerchantID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid session"})
		return
	}

	txID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid transaction ID"})
		return
	}

	if err := h.payments.CapturePayment(c.Request.Context(), txID, merchantUUID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Payment confirmed successfully"})
}

func (h *PublicPaymentHandler) getSessionPayload(c *gin.Context) (*checkoutSessionPayloadV1, error) {
	if h.cache == nil {
		return nil, errString("cache unavailable")
	}

	sessionToken := c.Query("session_token")
	if sessionToken == "" {
		sessionToken = c.GetHeader("X-Checkout-Session")
	}
	if sessionToken == "" {
		return nil, errString("session_token required")
	}

	key := "checkout_session:" + sessionToken
	raw, err := h.cache.Get(c.Request.Context(), key)
	if err != nil {
		return nil, errString("invalid or expired session")
	}

	var payload checkoutSessionPayloadV1
	if err := json.Unmarshal([]byte(raw), &payload); err != nil {
		return nil, errString("invalid session")
	}
	if payload.MerchantID == "" {
		return nil, errString("invalid session")
	}
	return &payload, nil
}

type errString string

func (e errString) Error() string { return string(e) }
