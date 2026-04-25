package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/yourcompany/payment-gateway/internal/domain/models"
	"github.com/yourcompany/payment-gateway/internal/domain/service"
	"github.com/yourcompany/payment-gateway/pkg/logger"
)

type MerchantHandler struct {
	merchantService *service.MerchantService
	reporting       *service.ReportingService
	logger          *logger.Logger
}

func NewMerchantHandler(merchantService *service.MerchantService, reporting *service.ReportingService, logger *logger.Logger) *MerchantHandler {
	return &MerchantHandler{merchantService: merchantService, reporting: reporting, logger: logger}
}

func (h *MerchantHandler) GetProfile(c *gin.Context) {
	merchantID, _ := uuid.Parse(c.GetString("merchant_id"))
	merchant, err := h.merchantService.GetProfile(c.Request.Context(), merchantID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Merchant not found"})
		return
	}
	c.JSON(http.StatusOK, merchant)
}

func (h *MerchantHandler) UpdateProfile(c *gin.Context) {
	merchantID, _ := uuid.Parse(c.GetString("merchant_id"))

	var req struct {
		BusinessName string  `json:"business_name"`
		Email        string  `json:"email"`
		Phone        string  `json:"phone"`
		Description  *string `json:"description"`
		Website      *string `json:"website"`
		Industry     *string `json:"industry"`
		TaxID        *string `json:"tax_id"`
		GSTNumber    *string `json:"gst_number"`
		Address      *struct {
			Street     string `json:"street"`
			City       string `json:"city"`
			State      string `json:"state"`
			Country    string `json:"country"`
			PostalCode string `json:"postal_code"`
		} `json:"address"`
		Settings     *struct {
			SettlementCycle   string                 `json:"settlement_cycle"`
			AutoRefundEnabled bool                   `json:"auto_refund_enabled"`
			WebhookURL        string                 `json:"webhook_url"`
			WebhookSecret     string                 `json:"webhook_secret"`
			PaymentMethods    []string               `json:"payment_methods"`
			FraudThreshold    int                    `json:"fraud_threshold"`
			Theme             *models.ThemeSettings  `json:"theme"`
			Preferences       map[string]interface{} `json:"preferences"`
		} `json:"settings"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	merchant, err := h.merchantService.GetProfile(c.Request.Context(), merchantID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Merchant not found"})
		return
	}

	if req.BusinessName != "" {
		merchant.BusinessName = req.BusinessName
	}
	if req.Email != "" {
		merchant.Email = req.Email
	}
	if req.Phone != "" {
		merchant.Phone = req.Phone
	}
	if req.Description != nil {
		merchant.Description = req.Description
	}
	if req.Website != nil {
		merchant.Website = req.Website
	}
	if req.Industry != nil {
		merchant.Industry = req.Industry
	}
	if req.TaxID != nil {
		merchant.TaxID = req.TaxID
	}
	if req.GSTNumber != nil {
		merchant.GSTNumber = req.GSTNumber
	}
	if req.Address != nil {
		merchant.AddressStreet = &req.Address.Street
		merchant.AddressCity = &req.Address.City
		merchant.AddressState = &req.Address.State
		merchant.AddressCountry = &req.Address.Country
		merchant.AddressPostalCode = &req.Address.PostalCode
	}
	if req.Settings != nil {
		merchant.Settings.SettlementCycle = req.Settings.SettlementCycle
		merchant.Settings.AutoRefundEnabled = req.Settings.AutoRefundEnabled
		merchant.Settings.WebhookURL = req.Settings.WebhookURL
		merchant.Settings.WebhookSecret = req.Settings.WebhookSecret
		merchant.Settings.PaymentMethods = req.Settings.PaymentMethods
		merchant.Settings.FraudThreshold = req.Settings.FraudThreshold
		if req.Settings.Theme != nil {
			merchant.Settings.Theme = req.Settings.Theme
		}
		merchant.Settings.Preferences = req.Settings.Preferences
	}

	// Ensure UpdatedAt is set so DB saves the change
	now := time.Now()
	merchant.UpdatedAt = now

	if err := h.merchantService.UpdateProfile(c.Request.Context(), merchant); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update profile"})
		return
	}

	c.JSON(http.StatusOK, merchant)
}

// POST /api/v1/merchant/kyc
func (h *MerchantHandler) UploadKYC(c *gin.Context) {
	merchantID, _ := uuid.Parse(c.GetString("merchant_id"))
	
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON mapping"})
		return
	}

	if err := h.merchantService.SubmitKYC(c.Request.Context(), merchantID, req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to submit KYC documents"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "KYC submitted successfully and is pending review"})
}

// GetBilling retrieves the merchant's platform billing profile and invoices
func (h *MerchantHandler) GetBilling(c *gin.Context) {
	merchantID, _ := uuid.Parse(c.GetString("merchant_id"))

	profile, invoices, err := h.merchantService.GetPlatformBilling(c.Request.Context(), merchantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load platform billing profile"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"profile":  profile,
			"invoices": invoices,
		},
	})
}


func (h *MerchantHandler) GetStats(c *gin.Context) {
	merchantID, _ := uuid.Parse(c.GetString("merchant_id"))
	if h.reporting == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "reporting service unavailable"})
		return
	}
	stats, err := h.reporting.GetMerchantStats(c.Request.Context(), merchantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch stats"})
		return
	}
	c.JSON(http.StatusOK, stats)
}

func (h *MerchantHandler) GetCustomers(c *gin.Context) {
	merchantID, _ := uuid.Parse(c.GetString("merchant_id"))

	customers, err := h.merchantService.GetCustomers(c.Request.Context(), merchantID)
	if err != nil {
		h.logger.Error("Failed to fetch customers", "error", err, "merchantID", merchantID)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch customers", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": customers})
}

func (h *MerchantHandler) GetBankAccounts(c *gin.Context) {
	merchantID, _ := uuid.Parse(c.GetString("merchant_id"))

	accounts, err := h.merchantService.GetBankAccounts(c.Request.Context(), merchantID)
	if err != nil {
		h.logger.Error("Failed to fetch bank accounts", "error", err, "merchantID", merchantID)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch bank accounts"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": accounts})
}

func (h *MerchantHandler) AddBankAccount(c *gin.Context) {
	merchantID, _ := uuid.Parse(c.GetString("merchant_id"))

	var req struct {
		BankName      string `json:"bankName" binding:"required"`
		AccountNumber string `json:"accountNumber" binding:"required"`
		AccountHolder string `json:"accountHolder" binding:"required"`
		IFSC          string `json:"ifsc" binding:"required"`
		AccountType   string `json:"accountType" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	account, err := h.merchantService.AddBankAccount(c.Request.Context(), merchantID, req.BankName, req.AccountNumber, req.AccountHolder, req.IFSC, req.AccountType)
	if err != nil {
		h.logger.Error("Failed to add bank account", "error", err, "merchantID", merchantID)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add bank account"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": account})
}

func (h *MerchantHandler) RequestWithdrawal(c *gin.Context) {
	merchantID, _ := uuid.Parse(c.GetString("merchant_id"))

	var req struct {
		Amount        float64 `json:"amount" binding:"required,gt=0"`
		BankAccountID string  `json:"bankAccountId" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	withdrawal, err := h.merchantService.RequestWithdrawal(c.Request.Context(), merchantID, req.Amount, req.BankAccountID)
	if err != nil {
		h.logger.Error("Failed to request withdrawal", "error", err, "merchantID", merchantID)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": withdrawal})
}

func (h *MerchantHandler) GetWithdrawals(c *gin.Context) {
	merchantID, _ := uuid.Parse(c.GetString("merchant_id"))

	withdrawals, err := h.merchantService.GetWithdrawals(c.Request.Context(), merchantID)
	if err != nil {
		h.logger.Error("Failed to fetch withdrawals", "error", err, "merchantID", merchantID)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch withdrawals"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": withdrawals})
}

func (h *MerchantHandler) GetBalance(c *gin.Context) {
	merchantID, _ := uuid.Parse(c.GetString("merchant_id"))

	balance, err := h.merchantService.GetBalance(c.Request.Context(), merchantID)
	if err != nil {
		h.logger.Error("Failed to fetch balance", "error", err, "merchantID", merchantID)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch balance"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": balance})
}

func (h *MerchantHandler) CreateApiKey(c *gin.Context) {
	merchantID := c.GetString("merchant_id")
	mid, err := uuid.Parse(merchantID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid merchant"})
		return
	}

	var req struct {
		Environment string `json:"environment" binding:"required,oneof=test live"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	key, rawSecret, err := h.merchantService.CreateApiKey(c.Request.Context(), mid, req.Environment)
	if err != nil {
		h.logger.Error("Failed to create API key", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create API key"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"data": gin.H{
			"id":              key.ID,
			"publishable_key": key.PublishableKey,
			"secret_key":      rawSecret, // Only shown once on creation
			"environment":     key.Environment,
			"created_at":      key.CreatedAt,
		},
	})
}

func (h *MerchantHandler) GetApiKeys(c *gin.Context) {
	merchantID := c.GetString("merchant_id")
	mid, err := uuid.Parse(merchantID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid merchant"})
		return
	}

	keys, err := h.merchantService.GetApiKeys(c.Request.Context(), mid)
	if err != nil {
		h.logger.Error("Failed to get API keys", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get API keys"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": keys})
}

func (h *MerchantHandler) RegenerateApiKey(c *gin.Context) {
	merchantID := c.GetString("merchant_id")
	mid, err := uuid.Parse(merchantID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid merchant"})
		return
	}

	var req struct {
		Environment string `json:"environment" binding:"required,oneof=test live"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	key, rawSecret, err := h.merchantService.CreateApiKey(c.Request.Context(), mid, req.Environment)
	if err != nil {
		h.logger.Error("Failed to regenerate API key", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to regenerate API key"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"id":              key.ID,
			"publishable_key": key.PublishableKey,
			"secret_key":      rawSecret,
			"environment":     key.Environment,
			"created_at":      key.CreatedAt,
		},
	})
}

func (h *MerchantHandler) RevokeApiKey(c *gin.Context) {
	merchantID := c.GetString("merchant_id")
	if _, err := uuid.Parse(merchantID); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid merchant"})
		return
	}

	keyID := c.Param("id")
	if keyID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "key ID required"})
		return
	}

	if err := h.merchantService.DeleteApiKey(c.Request.Context(), keyID); err != nil {
		h.logger.Error("Failed to revoke API key", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to revoke API key"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "API key revoked successfully"})
}

func (h *MerchantHandler) GetTeam(c *gin.Context) {
	merchantID, _ := uuid.Parse(c.GetString("merchant_id"))
	members, err := h.merchantService.GetTeamMembers(c.Request.Context(), merchantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch team members"})
		return
	}
	// Return empty array instead of null if no members exist
	if members == nil {
		members = []*models.TeamMember{}
	}
	c.JSON(http.StatusOK, gin.H{"data": members})
}

func (h *MerchantHandler) InviteTeamMember(c *gin.Context) {
	merchantID, _ := uuid.Parse(c.GetString("merchant_id"))
	var req struct {
		Name  string `json:"name" binding:"required"`
		Email string `json:"email" binding:"required,email"`
		Role  string `json:"role" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	validRoles := map[string]bool{"admin": true, "developer": true, "viewer": true}
	if !validRoles[req.Role] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid role specified. Must be 'admin', 'developer', or 'viewer'"})
		return
	}

	member, err := h.merchantService.InviteTeamMember(c.Request.Context(), merchantID, req.Name, req.Email, req.Role)
	if err != nil {
		h.logger.Error("Failed to invite team member", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to invite team member"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": member})
}

func (h *MerchantHandler) RemoveTeamMember(c *gin.Context) {
	merchantID, _ := uuid.Parse(c.GetString("merchant_id"))
	memberID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid member ID"})
		return
	}

	if err := h.merchantService.RemoveTeamMember(c.Request.Context(), memberID, merchantID); err != nil {
		h.logger.Error("Failed to remove team member", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove team member"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Team member removed"})
}

func (h *MerchantHandler) UpdatePassword(c *gin.Context) {
	merchantID, _ := uuid.Parse(c.GetString("merchant_id"))
	var req struct {
		CurrentPassword string `json:"current_password" binding:"required"`
		NewPassword     string `json:"new_password" binding:"required,min=8"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.merchantService.UpdatePassword(c.Request.Context(), merchantID, req.CurrentPassword, req.NewPassword); err != nil {
		h.logger.Error("Failed to update password", "error", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Password updated successfully"})
}
