package service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/yourcompany/payment-gateway/internal/domain/models"
	"github.com/yourcompany/payment-gateway/internal/domain/repository"
	"github.com/yourcompany/payment-gateway/pkg/logger"
)

type PayoutService struct {
	txRepo    repository.TransactionRepository
	logger    *logger.Logger
}

func NewPayoutService(txRepo repository.TransactionRepository, log *logger.Logger) *PayoutService {
	return &PayoutService{
		txRepo: txRepo,
		logger: log,
	}
}

// SplitTransaction executes Stripe-Connect style Marketplace logic.
// Takes a transaction, calculates the platform fee % vs the vendor volume,
// and mutates the JSONB transaction metadata pipeline to route the logic to settlements.
func (s *PayoutService) SplitTransaction(ctx context.Context, tx *models.Transaction, vendorAccountID string, platformFeeRate float64) error {
	s.logger.Infow("Initiating Stripe-Connect Marketplace Split Computation...", "tx_id", tx.ID, "vendor_id", vendorAccountID)

	// Math logic: Platform keeps the fee %, the Vendor keeps the subtotal.
	grossAmount := tx.Amount.InexactFloat64()
	platformFeeAmount := grossAmount * (platformFeeRate / 100.0)
	vendorPayoutAmount := grossAmount - platformFeeAmount

	// Append deep splitting analytics directly into the transaction metadata
	if tx.Metadata == nil {
		tx.Metadata = make(map[string]interface{})
	}

	tx.Metadata["is_marketplace_split"] = true
	tx.Metadata["vendor_account"] = vendorAccountID
	tx.Metadata["platform_fee_percent"] = platformFeeRate
	tx.Metadata["platform_revenue"] = platformFeeAmount
	tx.Metadata["vendor_revenue"] = vendorPayoutAmount
	tx.Metadata["split_date"] = time.Now().Format(time.RFC3339)

	// Physically perform the DB mutating overwrite to lock the split values in the database.
	err := s.txRepo.Update(ctx, tx)
	if err != nil {
		s.logger.Error("Database failed to finalize marketplace split trace execution", "error", err)
		return fmt.Errorf("split failure: %v", err)
	}

	s.logger.Infow("Successfully partitioned marketplace funds 💸",
		"gross", grossAmount,
		"vendor_keeps", vendorPayoutAmount,
		"platform_monetization", platformFeeAmount,
	)

	return nil
}
