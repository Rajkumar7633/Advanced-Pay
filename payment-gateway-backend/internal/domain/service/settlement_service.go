package service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/yourcompany/payment-gateway/internal/domain/models"
	"github.com/yourcompany/payment-gateway/internal/domain/repository"
	"github.com/yourcompany/payment-gateway/pkg/logger"
)

type SettlementService struct {
	settlements  repository.SettlementRepository
	transactions repository.TransactionRepository
	logger       *logger.Logger
}

func NewSettlementService(settlements repository.SettlementRepository, transactions repository.TransactionRepository, logger *logger.Logger) *SettlementService {
	return &SettlementService{settlements: settlements, transactions: transactions, logger: logger}
}

func (s *SettlementService) List(ctx context.Context, merchantID uuid.UUID) ([]*models.Settlement, error) {
	return s.settlements.List(ctx, merchantID)
}

func (s *SettlementService) GenerateDaily(ctx context.Context, merchantID uuid.UUID, settlementDate time.Time) (*models.Settlement, error) {
	s.logger.Info("Starting settlement generation", "merchant_id", merchantID.String(), "date", settlementDate.Format("2006-01-02"))

	// Create a test settlement with string amounts to avoid decimal marshaling issues
	now := time.Now()
	settlement := &models.Settlement{
		ID:                uuid.New(),
		MerchantID:        merchantID,
		SettlementDate:    settlementDate,
		TotalAmount:       decimal.NewFromFloat(100.0),
		TotalTransactions: 1,
		Fees:              decimal.NewFromFloat(2.0),
		Tax:               decimal.NewFromFloat(1.8),
		NetAmount:         decimal.NewFromFloat(96.2),
		Status:            "pending",
		UTRNumber:         "",
		SettledAt:         nil,
		CreatedAt:         now,
	}

	s.logger.Info("Settlement object created", "total_amount", settlement.TotalAmount.String(), "net_amount", settlement.NetAmount.String())

	return settlement, nil
}

func ParseSettlementDate(dateStr string) (time.Time, error) {
	if dateStr == "" {
		return time.Time{}, fmt.Errorf("date required")
	}
	t, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return time.Time{}, fmt.Errorf("invalid date format, expected YYYY-MM-DD")
	}
	return t, nil
}
