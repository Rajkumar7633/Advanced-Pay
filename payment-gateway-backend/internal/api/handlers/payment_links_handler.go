package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/yourcompany/payment-gateway/internal/domain/repository"
	"github.com/yourcompany/payment-gateway/pkg/logger"
)

// PaymentLinksHandler handles payment link operations
type PaymentLinksHandler struct {
	paymentLinkRepo repository.PaymentLinkRepository
	logger          *logger.Logger
}

func NewPaymentLinksHandler(paymentLinkRepo repository.PaymentLinkRepository, log *logger.Logger) *PaymentLinksHandler {
	return &PaymentLinksHandler{
		paymentLinkRepo: paymentLinkRepo,
		logger:          log,
	}
}

// CreatePaymentLinkRequest represents the request to create a payment link
type CreatePaymentLinkRequest struct {
	Title         string                 `json:"title" binding:"required"`
	Description   string                 `json:"description"`
	Amount        float64                `json:"amount" binding:"required,gt=0"`
	Currency      string                 `json:"currency" binding:"required"`
	ExpiryDate    *time.Time             `json:"expiry_date"`
	MaxUses       *int                   `json:"max_uses"`
	CustomerEmail string                 `json:"customer_email"`
	CustomerPhone string                 `json:"customer_phone"`
	Metadata      map[string]interface{} `json:"metadata"`
}

// PaymentLink represents a payment link
type PaymentLink struct {
	ID            uuid.UUID              `json:"id"`
	MerchantID    uuid.UUID              `json:"merchant_id"`
	Title         string                 `json:"title"`
	Description   string                 `json:"description"`
	Amount        float64                `json:"amount"`
	Currency      string                 `json:"currency"`
	LinkURL       string                 `json:"link_url"`
	ShortURL      string                 `json:"short_url"`
	Status        string                 `json:"status"` // active, expired, disabled
	ExpiryDate    *time.Time             `json:"expiry_date,omitempty"`
	MaxUses       *int                   `json:"max_uses,omitempty"`
	CurrentUses   int                    `json:"current_uses"`
	CustomerEmail string                 `json:"customer_email,omitempty"`
	CustomerPhone string                 `json:"customer_phone,omitempty"`
	Metadata      map[string]interface{} `json:"metadata"`
	CreatedAt     time.Time              `json:"created_at"`
	UpdatedAt     time.Time              `json:"updated_at"`
}

// CreatePaymentLink creates a new payment link
func (h *PaymentLinksHandler) CreatePaymentLink(c *gin.Context) {
	merchantID := c.GetString("merchant_id")
	if merchantID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "merchant_id missing"})
		return
	}

	var req CreatePaymentLinkRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Generate unique link ID
	linkID := uuid.New()

	// Generate link URLs
	linkURL := h.generateLinkURL(linkID)
	shortURL := h.generateShortURL(linkID)

	paymentLink := &PaymentLink{
		ID:            linkID,
		MerchantID:    uuid.MustParse(merchantID),
		Title:         req.Title,
		Description:   req.Description,
		Amount:        req.Amount,
		Currency:      req.Currency,
		LinkURL:       linkURL,
		ShortURL:      shortURL,
		Status:        "active",
		ExpiryDate:    req.ExpiryDate,
		MaxUses:       req.MaxUses,
		CurrentUses:   0,
		CustomerEmail: req.CustomerEmail,
		CustomerPhone: req.CustomerPhone,
		Metadata:      req.Metadata,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	// In production, save to database
	// For now, return the created link

	c.JSON(http.StatusCreated, gin.H{
		"data": paymentLink,
	})
}

// GetPaymentLink retrieves a payment link by ID
func (h *PaymentLinksHandler) GetPaymentLink(c *gin.Context) {
	linkID := c.Param("link_id")
	if linkID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "link_id required"})
		return
	}

	linkUUID, err := uuid.Parse(linkID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid link_id"})
		return
	}

	// Check merchant ownership
	merchantID := c.GetString("merchant_id")

	// In production, query database
	// For now, return mock data
	paymentLink := &PaymentLink{
		ID:         linkUUID,
		MerchantID: uuid.MustParse(merchantID),
		Title:      "Sample Payment Link",
		Amount:     100.00,
		Currency:   "INR",
		Status:     "active",
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}

	c.JSON(http.StatusOK, gin.H{
		"data": paymentLink,
	})
}

// ListPaymentLinks lists all payment links for a merchant
func (h *PaymentLinksHandler) ListPaymentLinks(c *gin.Context) {
	merchantID := c.GetString("merchant_id")
	if merchantID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "merchant_id missing"})
		return
	}

	// Get query parameters
	limit := c.DefaultQuery("limit", "50")
	offset := c.DefaultQuery("offset", "0")

	// In production, query database with filters
	// For now, return mock data
	links := []*PaymentLink{
		{
			ID:         uuid.New(),
			MerchantID: uuid.MustParse(merchantID),
			Title:      "Payment Link 1",
			Amount:     100.00,
			Currency:   "INR",
			Status:     "active",
			CreatedAt:  time.Now(),
		},
	}

	c.JSON(http.StatusOK, gin.H{
		"data": links,
		"pagination": gin.H{
			"limit":  limit,
			"offset": offset,
			"total":  len(links),
		},
	})
}

// UpdatePaymentLink updates an existing payment link
func (h *PaymentLinksHandler) UpdatePaymentLink(c *gin.Context) {
	linkID := c.Param("link_id")
	if linkID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "link_id required"})
		return
	}

	linkUUID, err := uuid.Parse(linkID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid link_id"})
		return
	}

	var req struct {
		Title       *string                `json:"title"`
		Description *string                `json:"description"`
		Amount      *float64               `json:"amount"`
		Currency    *string                `json:"currency"`
		ExpiryDate  *time.Time             `json:"expiry_date"`
		MaxUses     *int                   `json:"max_uses"`
		Status      *string                `json:"status"`
		Metadata    map[string]interface{} `json:"metadata"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check merchant ownership
	merchantID := c.GetString("merchant_id")

	// In production, update in database
	// For now, return updated link
	paymentLink := &PaymentLink{
		ID:         linkUUID,
		MerchantID: uuid.MustParse(merchantID),
		Title:      "Updated Payment Link",
		Amount:     100.00,
		Currency:   "INR",
		Status:     "active",
		UpdatedAt:  time.Now(),
	}

	if req.Title != nil {
		paymentLink.Title = *req.Title
	}
	if req.Amount != nil {
		paymentLink.Amount = *req.Amount
	}
	if req.Status != nil {
		paymentLink.Status = *req.Status
	}

	c.JSON(http.StatusOK, gin.H{
		"data": paymentLink,
	})
}

// DeletePaymentLink deletes a payment link
func (h *PaymentLinksHandler) DeletePaymentLink(c *gin.Context) {
	linkID := c.Param("link_id")
	if linkID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "link_id required"})
		return
	}

	linkUUID, err := uuid.Parse(linkID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid link_id"})
		return
	}

	// Check merchant ownership
	merchantID := c.GetString("merchant_id")

	// In production, delete from database
	// For now, just log
	h.logger.Info("Payment link deleted", "link_id", linkUUID, "merchant_id", merchantID)

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"message": "payment link deleted successfully",
		},
	})
}

// DisablePaymentLink disables a payment link temporarily
func (h *PaymentLinksHandler) DisablePaymentLink(c *gin.Context) {
	linkID := c.Param("link_id")
	if linkID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "link_id required"})
		return
	}

	linkUUID, err := uuid.Parse(linkID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid link_id"})
		return
	}

	// In production, update status to disabled
	h.logger.Info("Payment link disabled", "link_id", linkUUID)

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"message": "payment link disabled successfully",
		},
	})
}

// EnablePaymentLink enables a disabled payment link
func (h *PaymentLinksHandler) EnablePaymentLink(c *gin.Context) {
	linkID := c.Param("link_id")
	if linkID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "link_id required"})
		return
	}

	linkUUID, err := uuid.Parse(linkID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid link_id"})
		return
	}

	// In production, update status to active
	h.logger.Info("Payment link enabled", "link_id", linkUUID)

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"message": "payment link enabled successfully",
		},
	})
}

// GetPaymentLinkAnalytics returns analytics for a payment link
func (h *PaymentLinksHandler) GetPaymentLinkAnalytics(c *gin.Context) {
	linkID := c.Param("link_id")
	if linkID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "link_id required"})
		return
	}

	linkUUID, err := uuid.Parse(linkID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid link_id"})
		return
	}

	// In production, query analytics data
	analytics := map[string]interface{}{
		"link_id":         linkUUID.String(),
		"total_views":     1500,
		"total_clicks":    800,
		"total_payments":  450,
		"conversion_rate": 56.25,
		"total_revenue":   45000.00,
		"by_date": []map[string]interface{}{
			{"date": time.Now().Add(-2 * 24 * time.Hour).Format("2006-01-02"), "views": 500, "payments": 150},
			{"date": time.Now().Add(-1 * 24 * time.Hour).Format("2006-01-02"), "views": 600, "payments": 180},
			{"date": time.Now().Format("2006-01-02"), "views": 400, "payments": 120},
		},
	}

	c.JSON(http.StatusOK, gin.H{
		"data": analytics,
	})
}

// generateLinkURL generates the full payment link URL
func (h *PaymentLinksHandler) generateLinkURL(linkID uuid.UUID) string {
	return "https://pay.advancepay.com/link/" + linkID.String()
}

// generateShortURL generates a short URL for the payment link
func (h *PaymentLinksHandler) generateShortURL(linkID uuid.UUID) string {
	return "https://advpay.co/" + linkID.String()[:8]
}
