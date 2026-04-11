package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/yourcompany/payment-gateway/internal/domain/models"
	"github.com/yourcompany/payment-gateway/internal/domain/repository"
	"github.com/yourcompany/payment-gateway/pkg/logger"
)

type DisputeHandler struct {
	repo   *repository.DisputeRepository
	logger *logger.Logger
}

func NewDisputeHandler(repo *repository.DisputeRepository, logger *logger.Logger) *DisputeHandler {
	return &DisputeHandler{repo: repo, logger: logger}
}

// List all disputes for a merchant
func (h *DisputeHandler) List(c *gin.Context) {
	merchantID, err := uuid.Parse(c.GetString("merchant_id"))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid merchant"})
		return
	}

	disputes, err := h.repo.ListByMerchant(c.Request.Context(), merchantID)
	if err != nil {
		h.logger.Error("Failed to list disputes", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list disputes"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": disputes})
}

// Get dispute stats summary
func (h *DisputeHandler) Stats(c *gin.Context) {
	merchantID, err := uuid.Parse(c.GetString("merchant_id"))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid merchant"})
		return
	}

	stats, err := h.repo.GetStats(c.Request.Context(), merchantID)
	if err != nil {
		h.logger.Error("Failed to get dispute stats", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get stats"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": stats})
}

// Get single dispute by ID
func (h *DisputeHandler) Get(c *gin.Context) {
	merchantID, err := uuid.Parse(c.GetString("merchant_id"))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid merchant"})
		return
	}

	disputeID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid dispute id"})
		return
	}

	dispute, err := h.repo.GetByID(c.Request.Context(), disputeID, merchantID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "dispute not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": dispute})
}

// Create a new dispute (simulate incoming chargeback from payment network)
func (h *DisputeHandler) Create(c *gin.Context) {
	merchantID, err := uuid.Parse(c.GetString("merchant_id"))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid merchant"})
		return
	}

	var req struct {
		TransactionID string  `json:"transaction_id" binding:"required"`
		Amount        float64 `json:"amount" binding:"required"`
		Currency      string  `json:"currency"`
		Reason        string  `json:"reason" binding:"required"`
		Description   string  `json:"description"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	txID, err := uuid.Parse(req.TransactionID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid transaction_id"})
		return
	}

	currency := req.Currency
	if currency == "" {
		currency = "INR"
	}

	dueBy := time.Now().Add(7 * 24 * time.Hour) // 7 days to respond
	desc := req.Description

	d := &models.Dispute{
		ID:            uuid.New(),
		MerchantID:    merchantID,
		TransactionID: txID,
		Amount:        decimal.NewFromFloat(req.Amount),
		Currency:      currency,
		Reason:        req.Reason,
		Status:        models.DisputeStatusOpen,
		Description:   &desc,
		DueBy:         &dueBy,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	if err := h.repo.Create(c.Request.Context(), d); err != nil {
		h.logger.Error("Failed to create dispute", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create dispute"})
		return
	}

	h.logger.Info("Dispute created", "dispute_id", d.ID, "merchant_id", merchantID)
	c.JSON(http.StatusCreated, gin.H{"data": d})
}

// Submit evidence for a dispute
func (h *DisputeHandler) SubmitEvidence(c *gin.Context) {
	merchantID, err := uuid.Parse(c.GetString("merchant_id"))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid merchant"})
		return
	}

	disputeID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid dispute id"})
		return
	}

	var req struct {
		Evidence string `json:"evidence" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.repo.SubmitEvidence(c.Request.Context(), disputeID, merchantID, req.Evidence); err != nil {
		h.logger.Error("Failed to submit evidence", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to submit evidence"})
		return
	}

	h.logger.Info("Evidence submitted", "dispute_id", disputeID, "merchant_id", merchantID)
	c.JSON(http.StatusOK, gin.H{"message": "Evidence submitted successfully. Status moved to under_review."})
}
