package providers

import (
	"context"
	"errors"
	"fmt"
	"math/rand"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/yourcompany/payment-gateway/pkg/logger"
)

type RazorpayMock struct {
	logger *logger.Logger
}

func NewRazorpayMock(logger *logger.Logger) *RazorpayMock {
	return &RazorpayMock{logger: logger}
}

func (r *RazorpayMock) Name() string {
	return "razorpay"
}

func (r *RazorpayMock) Charge(ctx context.Context, amount decimal.Decimal, currency, method, orderID string) (*ChargeResult, error) {
	// Simulate unpredictable network failures for Razorpay (e.g. 30% failure rate)
	if rand.Intn(100) < 30 {
		r.logger.Warnw("Razorpay Mock Network Timeout", "order", orderID)
		return nil, errors.New("504 Gateway Timeout: Razorpay Unreachable")
	}

	// Simulated Latency
	time.Sleep(150 * time.Millisecond)

	pid := fmt.Sprintf("pay_%s", uuid.New().String()[:12])
	
	return &ChargeResult{
		ProviderTransactionID: pid,
		Status:                "success",
		ReceiptURL:            fmt.Sprintf("https://dashboard.razorpay.com/receipt/%s", pid),
	}, nil
}

func (r *RazorpayMock) Refund(ctx context.Context, amount decimal.Decimal, transactionID string) error {
	return nil
}

func (r *RazorpayMock) CheckStatus(ctx context.Context, transactionID string) (string, error) {
	return "success", nil
}
