package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/yourcompany/payment-gateway/internal/domain/models"
	"github.com/yourcompany/payment-gateway/internal/domain/service"
	"github.com/yourcompany/payment-gateway/internal/infrastructure/cache"
	"github.com/yourcompany/payment-gateway/pkg/logger"
)

type CheckoutHandler struct {
	cache          cache.Client
	paymentService *service.PaymentService
	logger         *logger.Logger
}

func NewCheckoutHandler(cacheClient cache.Client, paymentService *service.PaymentService, log *logger.Logger) *CheckoutHandler {
	return &CheckoutHandler{
		cache:          cacheClient,
		paymentService: paymentService,
		logger:         log,
	}
}

// CreateCheckoutSessionRequest - Request to create a checkout session
type CreateCheckoutSessionRequest struct {
	OrderID        string                 `json:"order_id" binding:"required"`
	Amount         float64                `json:"amount" binding:"required,gt=0"`
	Currency       string                 `json:"currency" binding:"required"`
	CustomerEmail  string                 `json:"customer_email" binding:"required,email"`
	CustomerPhone  string                 `json:"customer_phone"`
	CustomerName   string                 `json:"customer_name"`
	Description    string                 `json:"description"`
	Metadata       map[string]interface{} `json:"metadata"`
	PaymentMethods []string               `json:"payment_methods"` // card, upi, netbanking, wallet, bnpl
	SuccessURL     string                 `json:"success_url"`
	CancelURL      string                 `json:"cancel_url"`
	ExpiryMinutes  int                    `json:"expiry_minutes"`
}

// CheckoutSession - Represents a checkout session
type CheckoutSession struct {
	SessionID      string                 `json:"session_id"`
	MerchantID     string                 `json:"merchant_id"`
	OrderID        string                 `json:"order_id"`
	Amount         float64                `json:"amount"`
	Currency       string                 `json:"currency"`
	CustomerEmail  string                 `json:"customer_email"`
	CustomerPhone  string                 `json:"customer_phone,omitempty"`
	CustomerName   string                 `json:"customer_name,omitempty"`
	Description    string                 `json:"description,omitempty"`
	Metadata       map[string]interface{} `json:"metadata,omitempty"`
	PaymentMethods []string               `json:"payment_methods"`
	SuccessURL     string                 `json:"success_url,omitempty"`
	CancelURL      string                 `json:"cancel_url,omitempty"`
	Status         string                 `json:"status"` // created, processing, completed, cancelled, expired
	PaymentURL     string                 `json:"payment_url"`
	ExpiresAt      time.Time              `json:"expires_at"`
	CreatedAt      time.Time              `json:"created_at"`
}

// CreateSession creates a full-featured checkout session
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

	// Set default currency if not provided
	if req.Currency == "" {
		req.Currency = "INR"
	}

	// Set default payment methods if not provided
	if len(req.PaymentMethods) == 0 {
		req.PaymentMethods = []string{"card", "upi", "netbanking", "wallet", "bnpl"}
	}

	// Set default expiry if not provided
	if req.ExpiryMinutes == 0 {
		req.ExpiryMinutes = 30
	}

	sessionID := uuid.New().String()
	expiresAt := time.Now().Add(time.Duration(req.ExpiryMinutes) * time.Minute)

	session := CheckoutSession{
		SessionID:      sessionID,
		MerchantID:     merchantID,
		OrderID:        req.OrderID,
		Amount:         req.Amount,
		Currency:       req.Currency,
		CustomerEmail:  req.CustomerEmail,
		CustomerPhone:  req.CustomerPhone,
		CustomerName:   req.CustomerName,
		Description:    req.Description,
		Metadata:       req.Metadata,
		PaymentMethods: req.PaymentMethods,
		SuccessURL:     req.SuccessURL,
		CancelURL:      req.CancelURL,
		Status:         "created",
		PaymentURL:     h.generatePaymentURL(sessionID),
		ExpiresAt:      expiresAt,
		CreatedAt:      time.Now(),
	}

	// Store session in cache
	key := "checkout_session:" + sessionID
	sessionJSON, err := json.Marshal(session)
	if err != nil {
		h.logger.Error("Failed to marshal session", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create session"})
		return
	}
	if err := h.cache.Set(c.Request.Context(), key, sessionJSON, time.Duration(req.ExpiryMinutes)*time.Minute); err != nil {
		h.logger.Error("Failed to create checkout session", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create session"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"data": session,
	})
}

// GetSession retrieves a checkout session
func (h *CheckoutHandler) GetSession(c *gin.Context) {
	sessionID := c.Param("session_id")
	if sessionID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "session_id required"})
		return
	}

	key := "checkout_session:" + sessionID
	sessionData, err := h.cache.Get(c.Request.Context(), key)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "session not found"})
		return
	}

	var session CheckoutSession
	if err := json.Unmarshal([]byte(sessionData), &session); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to parse session"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": session,
	})
}

// ProcessPayment processes payment from checkout session
func (h *CheckoutHandler) ProcessPayment(c *gin.Context) {
	sessionID := c.Param("session_id")
	if sessionID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "session_id required"})
		return
	}

	var req struct {
		PaymentMethod  string                 `json:"payment_method" binding:"required"`
		PaymentDetails map[string]interface{} `json:"payment_details" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Retrieve session
	key := "checkout_session:" + sessionID
	sessionData, err := h.cache.Get(c.Request.Context(), key)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "session not found or expired"})
		return
	}

	var session CheckoutSession
	if err := json.Unmarshal([]byte(sessionData), &session); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to parse session"})
		return
	}

	// Check session status
	if session.Status != "created" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "session already processed"})
		return
	}

	// Check expiry
	if time.Now().After(session.ExpiresAt) {
		session.Status = "expired"
		sessionJSON, _ := json.Marshal(session)
		h.cache.Set(c.Request.Context(), key, sessionJSON, 0)
		c.JSON(http.StatusBadRequest, gin.H{"error": "session expired"})
		return
	}

	// Create payment request
	paymentReq := &models.CreatePaymentRequest{
		OrderID:       session.OrderID,
		Amount:        session.Amount,
		Currency:      session.Currency,
		PaymentMethod: req.PaymentMethod,
		CustomerEmail: session.CustomerEmail,
		CustomerPhone: session.CustomerPhone,
		Metadata:      session.Metadata,
	}

	// Add customer name and description to metadata if present
	if session.CustomerName != "" {
		if paymentReq.Metadata == nil {
			paymentReq.Metadata = make(map[string]interface{})
		}
		paymentReq.Metadata["customer_name"] = session.CustomerName
	}
	if session.Description != "" {
		if paymentReq.Metadata == nil {
			paymentReq.Metadata = make(map[string]interface{})
		}
		paymentReq.Metadata["description"] = session.Description
	}

	// Add payment details to metadata
	for k, v := range req.PaymentDetails {
		if paymentReq.Metadata == nil {
			paymentReq.Metadata = make(map[string]interface{})
		}
		paymentReq.Metadata[k] = v
	}

	merchantUUID, _ := uuid.Parse(session.MerchantID)
	response, err := h.paymentService.CreatePayment(c.Request.Context(), paymentReq, merchantUUID)
	if err != nil {
		h.logger.Error("Payment processing failed", "error", err)
		session.Status = "processing"
		sessionJSON, _ := json.Marshal(session)
		h.cache.Set(c.Request.Context(), key, sessionJSON, 0)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "payment processing failed"})
		return
	}

	// Update session status
	session.Status = "completed"
	sessionJSON, _ := json.Marshal(session)
	h.cache.Set(c.Request.Context(), key, sessionJSON, 24*time.Hour) // Keep for 24 hours

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"payment_id":     response.TransactionID,
			"payment_url":    response.PaymentURL,
			"status":         response.Status,
			"session_status": session.Status,
		},
	})
}

// CancelSession cancels a checkout session
func (h *CheckoutHandler) CancelSession(c *gin.Context) {
	sessionID := c.Param("session_id")
	if sessionID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "session_id required"})
		return
	}

	key := "checkout_session:" + sessionID
	sessionData, err := h.cache.Get(c.Request.Context(), key)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "session not found"})
		return
	}

	var session CheckoutSession
	if err := json.Unmarshal([]byte(sessionData), &session); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to parse session"})
		return
	}

	if session.Status != "created" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "session cannot be cancelled"})
		return
	}

	session.Status = "cancelled"
	sessionJSON, _ := json.Marshal(session)
	h.cache.Set(c.Request.Context(), key, sessionJSON, 24*time.Hour)

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"session_id": sessionID,
			"status":     "cancelled",
		},
	})
}

// GetPaymentMethods returns available payment methods
func (h *CheckoutHandler) GetPaymentMethods(c *gin.Context) {
	paymentMethods := []map[string]interface{}{
		{
			"id":           "card",
			"name":         "Credit/Debit Card",
			"display_name": "Card",
			"icon":         "credit-card",
			"enabled":      true,
			"fields":       []string{"card_number", "expiry", "cvv", "cardholder_name"},
		},
		{
			"id":           "upi",
			"name":         "UPI",
			"display_name": "UPI",
			"icon":         "smartphone",
			"enabled":      true,
			"fields":       []string{"upi_id"},
		},
		{
			"id":           "netbanking",
			"name":         "Net Banking",
			"display_name": "Net Banking",
			"icon":         "building",
			"enabled":      true,
			"fields":       []string{"bank_code", "account_number"},
		},
		{
			"id":           "wallet",
			"name":         "Wallet",
			"display_name": "Wallet",
			"icon":         "wallet",
			"enabled":      true,
			"fields":       []string{"wallet_provider", "wallet_number"},
		},
		{
			"id":           "bnpl",
			"name":         "Buy Now Pay Later",
			"display_name": "BNPL",
			"icon":         "calendar",
			"enabled":      true,
			"fields":       []string{"bnpl_provider", "customer_id"},
		},
	}

	c.JSON(http.StatusOK, gin.H{
		"data": paymentMethods,
	})
}

// generatePaymentURL generates the payment URL for checkout
func (h *CheckoutHandler) generatePaymentURL(sessionID string) string {
	return "/checkout/" + sessionID
}
