package handlers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v4"
	"github.com/shopspring/decimal"
	"github.com/yourcompany/payment-gateway/internal/domain/service"
	"github.com/yourcompany/payment-gateway/internal/infrastructure/cache"
	"github.com/yourcompany/payment-gateway/pkg/logger"
)

type AdminHandler struct {
	adminService  *service.AdminService
	cacheClient   cache.Client
	logger        *logger.Logger
	jwtSecret     string
	adminEmail    string
	adminPassword string
}

func NewAdminHandler(adminService *service.AdminService, cacheClient cache.Client, logger *logger.Logger, jwtSecret, adminEmail, adminPassword string) *AdminHandler {
	return &AdminHandler{
		adminService:  adminService,
		cacheClient:   cacheClient,
		logger:        logger,
		jwtSecret:     jwtSecret,
		adminEmail:    adminEmail,
		adminPassword: adminPassword,
	}
}

// AdminLogin — issues a JWT for the admin
func (h *AdminHandler) AdminLogin(c *gin.Context) {
	var req struct {
		Email    string `json:"email"    binding:"required"`
		Password string `json:"password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "email and password required"})
		return
	}

	if req.Email != h.adminEmail || req.Password != h.adminPassword {
		h.logger.Warn("Failed admin login attempt", "email", req.Email)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid admin credentials"})
		return
	}

	// Issue a special admin JWT (merchant_id = "ADMIN", role = "admin")
	claims := jwt.MapClaims{
		"merchant_id":   "ADMIN",
		"email":         h.adminEmail,
		"role":          "admin",
		"token_version": 1,
		"exp":           time.Now().Add(24 * time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenStr, err := token.SignedString([]byte(h.jwtSecret))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	h.logger.Info("Admin login successful", "email", req.Email)
	c.JSON(http.StatusOK, gin.H{
		"access_token": tokenStr,
		"role":         "admin",
		"email":        h.adminEmail,
	})
}

func (h *AdminHandler) GetSystemMetrics(c *gin.Context) {
	metrics, err := h.adminService.GetSystemMetrics(c.Request.Context())
	if err != nil {
		h.logger.Error("Failed to get system metrics", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch metrics"})
		return
	}
	c.JSON(http.StatusOK, metrics)
}

func (h *AdminHandler) GetAllMerchants(c *gin.Context) {
	merchants, err := h.adminService.GetAllMerchants(c.Request.Context())
	if err != nil {
		h.logger.Error("Failed to get merchants", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch merchants"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": merchants})
}

type UpdateMerchantStatusReq struct {
	Status string `json:"status" binding:"required,oneof=pending approved suspended"`
}

func (h *AdminHandler) UpdateMerchantStatus(c *gin.Context) {
	merchantID := c.Param("id")
	var req UpdateMerchantStatusReq

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.adminService.UpdateMerchantStatus(c.Request.Context(), merchantID, req.Status); err != nil {
		h.logger.Error("Failed to update merchant status", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update status"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Status updated successfully"})
}

func (h *AdminHandler) GetAllDisputes(c *gin.Context) {
	disputes, err := h.adminService.GetAllDisputes(c.Request.Context())
	if err != nil {
		h.logger.Error("Failed to get disputes", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch disputes"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": disputes})
}

func (h *AdminHandler) ResolveDispute(c *gin.Context) {
	disputeID := c.Param("id")
	if disputeID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "dispute id required"})
		return
	}

	var req struct {
		Status string `json:"status" binding:"required,oneof=won lost closed"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "status must be: won, lost, or closed"})
		return
	}

	if err := h.adminService.ResolveDispute(c.Request.Context(), disputeID, req.Status); err != nil {
		h.logger.Error("Failed to resolve dispute", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to resolve dispute"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Dispute resolved", "status": req.Status})
}

func (h *AdminHandler) GetRecentActivity(c *gin.Context) {
	activity, err := h.adminService.GetRecentActivity(c.Request.Context())
	if err != nil {
		h.logger.Error("Failed to get recent activity", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch activity"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": activity})
}

// GetAllTransactions returns platform-wide transactions for the admin
func (h *AdminHandler) GetAllTransactions(c *gin.Context) {
	transactions, err := h.adminService.GetAllTransactions(c.Request.Context())
	if err != nil {
		h.logger.Error("Failed to get all transactions", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch transactions"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": transactions})
}

func (h *AdminHandler) GetSettings(c *gin.Context) {
	settings, err := h.adminService.GetSettings(c.Request.Context())
	if err != nil {
		h.logger.Error("Failed to get settings", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch settings"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": settings})
}

func (h *AdminHandler) UpdateSettings(c *gin.Context) {
	var req struct {
		CardFee               string `json:"card_fee"`
		UPIFee                string `json:"upi_fee"`
		NetbankingFee         string `json:"netbanking_fee"`
		AutoApproveMerchants  bool   `json:"auto_approve_merchants"`
		FraudBlocking         bool   `json:"fraud_blocking"`
		InternationalPayments bool   `json:"international_payments"`
		MaintenanceMode       bool   `json:"maintenance_mode"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	settings, err := h.adminService.GetSettings(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to look up settings"})
		return
	}

	if req.CardFee != "" {
		settings.CardFee, _ = decimal.NewFromString(req.CardFee)
	}
	if req.UPIFee != "" {
		settings.UPIFee, _ = decimal.NewFromString(req.UPIFee)
	}
	if req.NetbankingFee != "" {
		settings.NetbankingFee, _ = decimal.NewFromString(req.NetbankingFee)
	}
	settings.AutoApproveMerchants = req.AutoApproveMerchants
	settings.FraudBlocking = req.FraudBlocking
	settings.InternationalPayments = req.InternationalPayments
	settings.MaintenanceMode = req.MaintenanceMode

	if err := h.adminService.UpdateSettings(c.Request.Context(), settings); err != nil {
		h.logger.Error("Failed to update settings", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update settings"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Settings updated"})
}

func (h *AdminHandler) GetHealthStats(c *gin.Context) {
	currentMinute := time.Now().Truncate(time.Minute).Unix()
	globalTPSKey := fmt.Sprintf("metrics:global_tps:%d", currentMinute)
	blocksKey := fmt.Sprintf("metrics:ratelimit_blocks:%d", currentMinute)
	
	tpsStr, _ := h.cacheClient.Get(c.Request.Context(), globalTPSKey)
	blocksStr, _ := h.cacheClient.Get(c.Request.Context(), blocksKey)
	
	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"live_tps": tpsStr,
			"blocks_last_minute": blocksStr,
			"status": "healthy",
		},
	})
}

func (h *AdminHandler) GetWebhookStats(c *gin.Context) {
	stats, err := h.adminService.GetWebhookStats(c.Request.Context())
	if err != nil {
		h.logger.Error("Failed to get webhook stats", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch webhook stats"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": stats})
}

func (h *AdminHandler) GetRiskTransactions(c *gin.Context) {
	transactions, err := h.adminService.GetRiskTransactions(c.Request.Context())
	if err != nil {
		h.logger.Error("Failed to get risk transactions", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch risk transactions"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": transactions})
}

func (h *AdminHandler) RefundTransaction(c *gin.Context) {
	txID := c.Param("id")
	if err := h.adminService.RefundTransaction(c.Request.Context(), txID); err != nil {
		h.logger.Error("Failed to refund transaction", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to refund transaction"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Transaction force-refunded"})
}

func (h *AdminHandler) AdminGetAllSettlements(c *gin.Context) {
	settlements, err := h.adminService.GetAllSettlements(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch settlements"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": settlements})
}

func (h *AdminHandler) AdminApproveSettlement(c *gin.Context) {
	id := c.Param("id")
	if err := h.adminService.ApproveSettlement(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to approve settlement"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Settlement approved successfully"})
}

func (h *AdminHandler) GetRoutingStats(c *gin.Context) {
	stats, err := h.adminService.GetRoutingStats(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch routing stats"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": stats})
}
