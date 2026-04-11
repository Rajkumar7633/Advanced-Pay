package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/yourcompany/payment-gateway/internal/domain/models"
	"github.com/yourcompany/payment-gateway/internal/domain/service"
	"github.com/yourcompany/payment-gateway/pkg/logger"
)

type VaultHandler struct {
	vaultService *service.VaultService
	logger       *logger.Logger
}

func NewVaultHandler(vaultService *service.VaultService, log *logger.Logger) *VaultHandler {
	return &VaultHandler{
		vaultService: vaultService,
		logger:       log,
	}
}

// TokenizeCard securely converts a physical PAN into a proxy token
func (h *VaultHandler) TokenizeCard(c *gin.Context) {
	merchantIDStr, exists := c.Get("merchant_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized vaulting access"})
		return
	}

	merchantID, err := uuid.Parse(merchantIDStr.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid merchant ID"})
		return
	}

	var req models.VaultTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.vaultService.TokenizeCard(c.Request.Context(), merchantID, req)
	if err != nil {
		h.logger.Error("Tokenization API error", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Vault operation failed securely"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"data": resp,
		"meta": gin.H{
			"message": "Sensitive PAN tokenized in PCI Vault. Use this token_id for future checkouts.",
		},
	})
}
