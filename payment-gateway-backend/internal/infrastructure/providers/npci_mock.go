package providers

import (
	"context"
	"fmt"
	"math/rand"
	"time"

	"github.com/shopspring/decimal"
	"github.com/yourcompany/payment-gateway/pkg/logger"
)

type NPCIProcessor struct {
	logger *logger.Logger
}

func NewNPCIProcessor(logger *logger.Logger) *NPCIProcessor {
	return &NPCIProcessor{logger: logger}
}

func (p *NPCIProcessor) Name() string {
	return "npci"
}

func (p *NPCIProcessor) Charge(ctx context.Context, amount decimal.Decimal, currency, method, orderID string) (*ChargeResult, error) {
	p.logger.Info("Charging via NPCI Direct", "amount", amount, "method", method, "orderID", orderID)

	// Simulate high-performance direct processing
	time.Sleep(100 * time.Millisecond)

	// For direct NPCI, we assume it's mostly UPI or Netbanking
	// Randomly fail 5% of the time for realism
	if rand.Float32() < 0.05 {
		return &ChargeResult{
			ProviderTransactionID: fmt.Sprintf("NPCI-%d", time.Now().UnixNano()),
			Status:                "failed",
		}, nil
	}

	return &ChargeResult{
		ProviderTransactionID: fmt.Sprintf("NPCI-%d", time.Now().UnixNano()),
		Status:                "success",
		ReceiptURL:            fmt.Sprintf("https://npci.org.in/receipt/%s", orderID),
	}, nil
}

func (p *NPCIProcessor) Refund(ctx context.Context, amount decimal.Decimal, transactionID string) error {
	p.logger.Info("Refunding via NPCI Direct", "amount", amount, "transactionID", transactionID)
	return nil
}

func (p *NPCIProcessor) CheckStatus(ctx context.Context, transactionID string) (string, error) {
	return "success", nil
}
