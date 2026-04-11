package handlers

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/yourcompany/payment-gateway/internal/domain/service"
	"github.com/yourcompany/payment-gateway/pkg/logger"
)

type SettlementHandler struct {
	service *service.SettlementService
	logger  *logger.Logger
}

func NewSettlementHandler(svc *service.SettlementService, logger *logger.Logger) *SettlementHandler {
	return &SettlementHandler{service: svc, logger: logger}
}

func (h *SettlementHandler) List(c *gin.Context) {
	merchantID := c.GetString("merchant_id")
	mid, err := uuid.Parse(merchantID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid merchant"})
		return
	}

	rows, err := h.service.List(c.Request.Context(), mid)
	if err != nil {
		h.logger.Error("Failed to list settlements", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list settlements"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": rows})
}

func (h *SettlementHandler) Generate(c *gin.Context) {
	merchantID := c.GetString("merchant_id")
	mid, err := uuid.Parse(merchantID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid merchant"})
		return
	}

	dateStr := c.Query("date")
	d, err := service.ParseSettlementDate(dateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if PDF download requested
	pdfFormat := c.Query("format")
	if pdfFormat == "pdf" {
		// Generate settlement for PDF
		settlement, err := h.service.GenerateDaily(c.Request.Context(), mid, d)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// Generate simple PDF content
		pdfContent := fmt.Sprintf(`Settlement Report
================
Date: %s
Merchant ID: %s
Settlement ID: %s

Total Amount: ₹%.2f
Fees: ₹%.2f
Tax: ₹%.2f
Net Amount: ₹%.2f
Status: %s
Transactions: %d

Generated on: %s
`, d.Format("2006-01-02"),
			settlement.MerchantID.String(),
			settlement.ID.String(),
			settlement.TotalAmount.InexactFloat64(),
			settlement.Fees.InexactFloat64(),
			settlement.Tax.InexactFloat64(),
			settlement.NetAmount.InexactFloat64(),
			settlement.Status,
			settlement.TotalTransactions,
			settlement.CreatedAt.Format("2006-01-02 15:04:05"))

		// Generate PDF response
		c.Header("Content-Type", "application/pdf")
		c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=settlement_%s.pdf", d.Format("2006-01-02")))
		c.String(http.StatusOK, pdfContent)
		return
	}

	settlement, err := h.service.GenerateDaily(c.Request.Context(), mid, d)
	if err != nil {
		h.logger.Error("Failed to generate settlement", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate settlement"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": settlement})
}
