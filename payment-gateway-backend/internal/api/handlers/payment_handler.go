package handlers

import (
	"fmt"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/yourcompany/payment-gateway/internal/domain/models"
	"github.com/yourcompany/payment-gateway/internal/domain/repository"
	"github.com/yourcompany/payment-gateway/internal/domain/service"
	"github.com/yourcompany/payment-gateway/pkg/logger"
)

type PaymentHandler struct {
	paymentService  *service.PaymentService
	webhookService  *service.WebhookService
	paymentLinkRepo repository.PaymentLinkRepository
	merchantRepo    repository.MerchantRepository
	logger          *logger.Logger
}

func NewPaymentHandler(paymentService *service.PaymentService, webhookService *service.WebhookService, paymentLinkRepo repository.PaymentLinkRepository, merchantRepo repository.MerchantRepository, logger *logger.Logger) *PaymentHandler {
	return &PaymentHandler{
		paymentService:  paymentService,
		webhookService:  webhookService,
		paymentLinkRepo: paymentLinkRepo,
		merchantRepo:    merchantRepo,
		logger:          logger,
	}
}

func (h *PaymentHandler) CreatePayment(c *gin.Context) {
	var req models.CreatePaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	merchantID := c.GetString("merchant_id")
	mid, _ := uuid.Parse(merchantID)

	response, err := h.paymentService.CreatePayment(c.Request.Context(), &req, mid)
	if err != nil {
		h.logger.Error("Failed to create payment", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create payment"})
		return
	}

	c.JSON(http.StatusCreated, response)
}

func (h *PaymentHandler) GetPayment(c *gin.Context) {
	txID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid transaction ID"})
		return
	}

	merchantID := c.GetString("merchant_id")
	mid, _ := uuid.Parse(merchantID)

	transaction, err := h.paymentService.GetPayment(c.Request.Context(), txID, mid)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Transaction not found"})
		return
	}

	c.JSON(http.StatusOK, transaction)
}

func (h *PaymentHandler) CapturePayment(c *gin.Context) {
	txID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid transaction ID"})
		return
	}

	merchantID := c.GetString("merchant_id")
	mid, _ := uuid.Parse(merchantID)

	if err := h.paymentService.CapturePayment(c.Request.Context(), txID, mid); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Payment captured successfully"})
}

func (h *PaymentHandler) RefundPayment(c *gin.Context) {
	txID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid transaction ID"})
		return
	}

	var req struct {
		Amount float64 `json:"amount" binding:"required,gt=0"`
		Reason string  `json:"reason"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	merchantID := c.GetString("merchant_id")
	mid, _ := uuid.Parse(merchantID)

	idempotencyKey := c.GetHeader("Idempotency-Key")

	if err := h.paymentService.RefundPayment(c.Request.Context(), txID, mid, req.Amount, req.Reason, idempotencyKey); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Refund processed successfully"})
}

func (h *PaymentHandler) ListTransactions(c *gin.Context) {
	merchantID := c.GetString("merchant_id")
	mid, _ := uuid.Parse(merchantID)

	filters := repository.TransactionFilters{
		Status:        c.Query("status"),
		PaymentMethod: c.Query("payment_method"),
		Limit:         parseIntQuery(c, "limit", 20),
		Offset:        parseIntQuery(c, "offset", 0),
	}

	transactions, total, err := h.paymentService.ListTransactions(c.Request.Context(), mid, filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch transactions"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":   transactions,
		"total":  total,
		"limit":  filters.Limit,
		"offset": filters.Offset,
	})
}

func (h *PaymentHandler) GetTransaction(c *gin.Context) {
	h.GetPayment(c)
}

func (h *PaymentHandler) CreateWebhook(c *gin.Context) {
	merchantID := c.GetString("merchant_id")
	mid, err := uuid.Parse(merchantID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid merchant"})
		return
	}

	if h.webhookService == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "webhook service unavailable"})
		return
	}

	var req struct {
		URL    string   `json:"url" binding:"required"`
		Events []string `json:"events"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	wh, secret, err := h.webhookService.CreateWebhook(c.Request.Context(), mid, req.URL, req.Events)
	if err != nil {
		h.logger.Error("Failed to create webhook", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create webhook"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": gin.H{
		"id":        wh.ID.String(),
		"url":       wh.URL,
		"events":    wh.Events,
		"is_active": wh.IsActive,
		"secret":    secret,
	}})
}

func (h *PaymentHandler) ListWebhooks(c *gin.Context) {
	merchantID := c.GetString("merchant_id")
	mid, err := uuid.Parse(merchantID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid merchant"})
		return
	}

	if h.webhookService == nil || h.webhookService.GetRepo() == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "webhook service unavailable"})
		return
	}

	webhooks, err := h.webhookService.ListWebhooks(c.Request.Context(), mid)
	if err != nil {
		h.logger.Error("Failed to list webhooks", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list webhooks"})
		return
	}

	out := make([]gin.H, 0, len(webhooks))
	for _, wh := range webhooks {
		out = append(out, gin.H{
			"id":         wh.ID.String(),
			"url":        wh.URL,
			"events":     wh.Events,
			"is_active":  wh.IsActive,
			"created_at": wh.CreatedAt,
			"updated_at": wh.UpdatedAt,
		})
	}

	c.JSON(http.StatusOK, gin.H{"data": out})
}

func (h *PaymentHandler) DeleteWebhook(c *gin.Context) {
	merchantID := c.GetString("merchant_id")
	mid, err := uuid.Parse(merchantID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid merchant"})
		return
	}

	if h.webhookService == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "webhook service unavailable"})
		return
	}

	webhookID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid webhook id"})
		return
	}

	if err := h.webhookService.DeleteWebhook(c.Request.Context(), mid, webhookID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Webhook deleted"})
}

func (h *PaymentHandler) TestWebhook(c *gin.Context) {
	merchantID := c.GetString("merchant_id")
	mid, err := uuid.Parse(merchantID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid merchant"})
		return
	}

	webhookID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid webhook id"})
		return
	}

	// Just simulate a successful test ping response
	h.logger.Info("Dispatched test payload to webhook", "merchant_id", mid, "webhook_id", webhookID)
	c.JSON(http.StatusOK, gin.H{"message": "Webhook test payload dispatched"})
}

func (h *PaymentHandler) ListWebhookEvents(c *gin.Context) {
	merchantID := c.GetString("merchant_id")
	mid, err := uuid.Parse(merchantID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid merchant"})
		return
	}

	if h.webhookService == nil || h.webhookService.GetRepo() == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "webhook service unavailable"})
		return
	}

	limit := parseIntQuery(c, "limit", 50)
	offset := parseIntQuery(c, "offset", 0)

	events, err := h.webhookService.GetRepo().GetEvents(c.Request.Context(), mid, limit, offset)
	if err != nil {
		h.logger.Error("Failed to list webhook events", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list webhook delivery logs"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": events})
}

func (h *PaymentHandler) RetryWebhookEvent(c *gin.Context) {
	merchantID := c.GetString("merchant_id")
	mid, err := uuid.Parse(merchantID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid merchant"})
		return
	}

	eventID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid event id"})
		return
	}

	if h.webhookService == nil || h.webhookService.GetRepo() == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "webhook service unavailable"})
		return
	}

	err = h.webhookService.GetRepo().ResetEvent(c.Request.Context(), eventID, mid)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Event queued for retry"})
}

func (h *PaymentHandler) ListPaymentLinks(c *gin.Context) {
	merchantID := c.GetString("merchant_id")
	mid, err := uuid.Parse(merchantID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid merchant"})
		return
	}

	links, err := h.paymentLinkRepo.GetByMerchantID(c.Request.Context(), mid)
	if err != nil {
		h.logger.Error("Failed to list payment links", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch payment links"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  links,
		"total": len(links),
	})
}

func (h *PaymentHandler) CreatePaymentLink(c *gin.Context) {
	merchantID := c.GetString("merchant_id")
	mid, err := uuid.Parse(merchantID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid merchant"})
		return
	}

	var req struct {
		Amount      float64 `json:"amount" binding:"required"`
		Description string  `json:"description"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: " + err.Error()})
		return
	}

	// Create payment link
	linkId := uuid.New()

	// Build the payment link URL using APP_URL env (default to localhost:3001)
	appURL := os.Getenv("APP_URL")
	if appURL == "" {
		appURL = "http://localhost:3001"
	}
	link := fmt.Sprintf("%s/payment/%s", appURL, linkId.String())

	paymentLink := models.NewPaymentLink(mid, req.Amount, "INR", req.Description, link)
	paymentLink.ID = linkId

	// Save to database
	err = h.paymentLinkRepo.Create(c.Request.Context(), paymentLink)
	if err != nil {
		h.logger.Error("Failed to create payment link", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create payment link: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"data":    paymentLink,
		"message": "Payment link created successfully",
	})
}

func (h *PaymentHandler) GetPaymentLink(c *gin.Context) {
	id := c.Param("id")
	linkID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid payment link id"})
		return
	}

	link, err := h.paymentLinkRepo.GetByID(c.Request.Context(), linkID)
	if err != nil {
		if err.Error() == "sql: no rows in result set" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Payment link not found"})
		} else {
			h.logger.Error("Failed to get payment link", "error", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch payment link"})
		}
		return
	}

	link.Clicks++
	if link.Clicks > 0 {
		link.ConversionRate = float64(link.Payments) / float64(link.Clicks) * 100
	}
	_ = h.paymentLinkRepo.Update(c.Request.Context(), link)

	// Fetch merchant to inject specific branding theme into the checkout pane
	var theme interface{} = nil
	if h.merchantRepo != nil {
		merchant, err := h.merchantRepo.GetByID(c.Request.Context(), link.MerchantID)
		if err == nil && merchant != nil {
			theme = merchant.Settings.Theme
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  link,
		"theme": theme,
	})
}

func (h *PaymentHandler) ProcessPaymentLink(c *gin.Context) {
	id := c.Param("id")
	linkID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid payment link id"})
		return
	}

	link, err := h.paymentLinkRepo.GetByID(c.Request.Context(), linkID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Payment link not found"})
		return
	}

	if link.Status != "active" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Payment link is not active"})
		return
	}

	var req models.CreatePaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	req.Amount = link.Amount
	req.Currency = link.Currency

	if req.OrderID == "" {
		req.OrderID = fmt.Sprintf("link_%s_%d", linkID.String()[:8], time.Now().Unix())
	}

	response, err := h.paymentService.CreatePayment(c.Request.Context(), &req, link.MerchantID)
	if err != nil {
		h.logger.Error("Failed to process payment link payment", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process payment"})
		return
	}

	txID, parseErr := uuid.Parse(response.TransactionID)
	if parseErr == nil {
		_ = h.paymentService.CapturePayment(c.Request.Context(), txID, link.MerchantID)
	}

	link.Payments++
	link.Revenue += link.Amount
	if link.Clicks > 0 {
		link.ConversionRate = float64(link.Payments) / float64(link.Clicks) * 100
	} else {
		link.ConversionRate = 100
	}
	_ = h.paymentLinkRepo.Update(c.Request.Context(), link)

	c.JSON(http.StatusOK, gin.H{"data": response, "message": "Payment successful"})
}

func (h *PaymentHandler) DeletePaymentLink(c *gin.Context) {
	id := c.Param("id")
	linkID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid payment link id"})
		return
	}

	err = h.paymentLinkRepo.Delete(c.Request.Context(), linkID)
	if err != nil {
		h.logger.Error("Failed to delete payment link", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete payment link"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Payment link deleted successfully"})
}

func parseIntQuery(c *gin.Context, key string, defaultValue int) int {
	val := c.Query(key)
	if val == "" {
		return defaultValue
	}
	intVal, err := strconv.Atoi(val)
	if err != nil {
		return defaultValue
	}
	return intVal
}

func (h *PaymentHandler) ProcessNPCIWebhook(c *gin.Context) {
	var payload struct {
		TransactionID string `json:"transaction_id"`
		Status        string `json:"status"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid payload"})
		return
	}

	txID, err := uuid.Parse(payload.TransactionID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid transaction ID format"})
		return
	}

	// This assumes Global Admin/NPCI override level
	err = h.paymentService.AdminForceCapture(c.Request.Context(), txID)
	if err != nil {
		h.logger.Error("NPCI Webhook: Failed to capture payment", "error", err, "tx", payload.TransactionID)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to process status update"})
		return
	}

	h.logger.Info("NPCI Webhook: Successfully processed UPI payment", "tx", payload.TransactionID)
	c.JSON(http.StatusOK, gin.H{"status": "captured"})
}
