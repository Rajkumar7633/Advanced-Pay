package worker

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/yourcompany/payment-gateway/internal/domain/models"
	"github.com/yourcompany/payment-gateway/internal/domain/repository"
	"github.com/yourcompany/payment-gateway/pkg/logger"
)

type SettlementWorker struct {
	settlementRepo  repository.SettlementRepository
	transactionRepo repository.TransactionRepository
	logger          *logger.Logger
}

func NewSettlementWorker(settlementRepo repository.SettlementRepository, transactionRepo repository.TransactionRepository, logger *logger.Logger) *SettlementWorker {
	return &SettlementWorker{
		settlementRepo:  settlementRepo,
		transactionRepo: transactionRepo,
		logger:          logger,
	}
}

func (w *SettlementWorker) Start(ctx context.Context) {
	w.logger.Info("Starting Settlement Automation Worker (India First Gateway)")
	
	ticker := time.NewTicker(1 * time.Minute) // In demo mode, we settle every minute
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			w.processSettlements(ctx)
		}
	}
}

func (w *SettlementWorker) processSettlements(ctx context.Context) {
	w.logger.Info("Running settlement aggregation cycle...")

	// 1. Fetch all successful transactions that haven't been settled yet
	txs, err := w.transactionRepo.GetUnsettled(ctx)
	if err != nil {
		w.logger.Error("Failed to fetch unsettled transactions", "error", err)
		return
	}

	if len(txs) == 0 {
		w.logger.Info("No pending transactions for settlement.")
		return
	}

	w.logger.Info("Found pending transactions", "count", len(txs))

	// 2. Group by merchant
	merchantTxs := make(map[uuid.UUID][]*models.Transaction)
	for _, tx := range txs {
		merchantTxs[tx.MerchantID] = append(merchantTxs[tx.MerchantID], tx)
	}

	// 3. Create settlement per merchant
	for mID, mtxs := range merchantTxs {
		w.logger.Info("Processing settlement", "merchant_id", mID, "tx_count", len(mtxs))

		total := decimal.Zero
		var txIDs []uuid.UUID
		for _, tx := range mtxs {
			total = total.Add(tx.Amount)
			txIDs = append(txIDs, tx.ID)
		}

		// Simple fee calculation logic (Fixed 2% MDR + 18% GST on fee)
		feeRate := decimal.NewFromFloat(0.02)
		gstRate := decimal.NewFromFloat(0.18)

		fees := total.Mul(feeRate).Round(2)
		tax := fees.Mul(gstRate).Round(2)
		net := total.Sub(fees).Sub(tax)

		settlement := &models.Settlement{
			ID:                uuid.New(),
			MerchantID:        mID,
			SettlementDate:    time.Now(),
			TotalAmount:       total,
			TotalTransactions: len(mtxs),
			Fees:              fees,
			Tax:               tax,
			NetAmount:         net,
			Status:            "pending",
			CreatedAt:         time.Now(),
			UpdatedAt:         time.Now(),
		}

		// Save settlement
		if err := w.settlementRepo.Create(ctx, settlement); err != nil {
			w.logger.Error("Failed to create settlement", "merchant_id", mID, "error", err)
			continue
		}

		// Mark transactions as settled
		if err := w.transactionRepo.MarkAsSettled(ctx, txIDs, settlement.ID); err != nil {
			w.logger.Error("Failed to mark transactions as settled", "settlement_id", settlement.ID, "error", err)
			continue
		}

		w.logger.Info("Settlement batch created successfully", "settlement_id", settlement.ID, "net_amount", net)
	}
}
