package service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/yourcompany/payment-gateway/internal/domain/models"
	"github.com/yourcompany/payment-gateway/internal/domain/repository"
	"github.com/yourcompany/payment-gateway/pkg/crypto"
	"github.com/yourcompany/payment-gateway/pkg/logger"
)

type VaultService struct {
	repo   repository.VaultRepository
	logger *logger.Logger
}

func NewVaultService(repo repository.VaultRepository, log *logger.Logger) *VaultService {
	return &VaultService{
		repo:   repo,
		logger: log,
	}
}

// TokenizeCard securely encrypts a card number into the vault and returns a reference token
func (s *VaultService) TokenizeCard(ctx context.Context, merchantID uuid.UUID, req models.VaultTokenRequest) (*models.VaultTokenResponse, error) {
	if len(req.CardNumber) < 13 {
		return nil, fmt.Errorf("invalid card number length")
	}

	encryptedPAN, err := crypto.Encrypt(req.CardNumber)
	if err != nil {
		s.logger.Error("Vault tokenization encryption failed", "error", err)
		return nil, fmt.Errorf("failed to secure card data")
	}

	last4 := req.CardNumber[len(req.CardNumber)-4:]
	tokenID := fmt.Sprintf("tok_%s", uuid.New().String())

	// Simple brand heuristic for demo
	brand := "visa"
	if req.CardNumber[0] == '5' {
		brand = "mastercard" // Basic regex mock
	} else if req.CardNumber[0] == '3' {
		brand = "amex"
	}

	now := time.Now()
	vaultEntry := &models.CardVault{
		ID:               uuid.New(),
		MerchantID:       merchantID,
		CustomerEmail:    req.CustomerEmail,
		TokenID:          tokenID,
		CardLast4:        last4,
		CardBrand:        brand,
		ExpiryMonth:      req.ExpiryMonth,
		ExpiryYear:       req.ExpiryYear,
		EncryptedPayload: encryptedPAN, // Securely persisted 
		CreatedAt:        now,
		UpdatedAt:        now,
	}

	if err := s.repo.Create(ctx, vaultEntry); err != nil {
		return nil, err
	}

	s.logger.Infow("Successfully vaulted card", "token_id", tokenID, "merchant_id", merchantID)

	return &models.VaultTokenResponse{
		TokenID:   tokenID,
		CardLast4: last4,
		CardBrand: brand,
	}, nil
}

// RevealPAN retrieves the secure vault entry and decrypts the pure PAN into memory 
func (s *VaultService) RevealPAN(ctx context.Context, merchantID uuid.UUID, tokenID string) (*models.CardVault, string, error) {
	vaultList, err := s.repo.GetByToken(ctx, tokenID)
	if err != nil {
		return nil, "", fmt.Errorf("token not found or invalid")
	}

	if vaultList.MerchantID != merchantID {
		s.logger.Warnw("Cross-merchant vault access attempt detected", "merchant_id", merchantID, "token", tokenID)
		return nil, "", fmt.Errorf("unauthorized to route this token")
	}

	// Just-in-time extraction! 
	pan, err := crypto.Decrypt(vaultList.EncryptedPayload)
	if err != nil {
		return nil, "", fmt.Errorf("fatal cryptography decryption failure in vault core")
	}

	s.logger.Infow("1-Click Just-in-Time Decryption triggered", "token_id", tokenID)

	return vaultList, pan, nil
}
