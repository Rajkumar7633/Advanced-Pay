package providers

import (
	"context"

	"github.com/shopspring/decimal"
)

// PaymentProcessor defines the unified contract each banking gateway MUST satisfy.
type PaymentProcessor interface {
	Name() string
	Charge(ctx context.Context, amount decimal.Decimal, currency, method, orderID string) (*ChargeResult, error)
	Refund(ctx context.Context, amount decimal.Decimal, transactionID string) error
	CheckStatus(ctx context.Context, transactionID string) (string, error)
}

// ChargeResult encapsulates identical parameters standard across disparate Gateways.
type ChargeResult struct {
	ProviderTransactionID string
	Status                string // "success", "failed", "pending"
	ReceiptURL            string
}
