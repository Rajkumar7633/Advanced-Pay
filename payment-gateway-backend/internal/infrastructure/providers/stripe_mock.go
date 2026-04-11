package providers

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/yourcompany/payment-gateway/pkg/logger"
)

type StripeMock struct {
	logger *logger.Logger
}

func NewStripeMock(logger *logger.Logger) *StripeMock {
	return &StripeMock{logger: logger}
}

func (s *StripeMock) Name() string {
	return "stripe"
}

func (s *StripeMock) Charge(ctx context.Context, amount decimal.Decimal, currency, method, orderID string) (*ChargeResult, error) {
	// Stripe is our highly reliable secondary fallback node
	time.Sleep(80 * time.Millisecond)

	pid := fmt.Sprintf("pi_%s", uuid.New().String()[:12])

	s.logger.Infow("Stripe Transaction Succeeded", "pid", pid, "amount", amount.String())

	return &ChargeResult{
		ProviderTransactionID: pid,
		Status:                "success",
		ReceiptURL:            fmt.Sprintf("https://dashboard.stripe.com/payments/%s", pid),
	}, nil
}

func (s *StripeMock) Refund(ctx context.Context, amount decimal.Decimal, transactionID string) error {
	return nil
}

func (s *StripeMock) CheckStatus(ctx context.Context, transactionID string) (string, error) {
	return "success", nil
}
