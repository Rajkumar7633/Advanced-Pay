package providers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	"github.com/shopspring/decimal"
	"github.com/yourcompany/payment-gateway/pkg/logger"
)

// RazorpayProvider calls the real Razorpay REST API.
// Falls back to simulation if keys are not configured.
type RazorpayProvider struct {
	keyID     string
	keySecret string
	logger    *logger.Logger
	client    *http.Client
}

// NewRazorpayProvider creates a real Razorpay provider using env credentials.
// If RAZORPAY_KEY_ID is not set, it behaves like the mock (no random failure).
func NewRazorpayProvider(log *logger.Logger) *RazorpayProvider {
	return &RazorpayProvider{
		keyID:     os.Getenv("RAZORPAY_KEY_ID"),
		keySecret: os.Getenv("RAZORPAY_KEY_SECRET"),
		logger:    log,
		client:    &http.Client{Timeout: 10 * time.Second},
	}
}

func (r *RazorpayProvider) Name() string {
	return "razorpay"
}

// ─── Razorpay API Structs ───────────────────────────────────────────────────

type razorpayOrderRequest struct {
	Amount   int64  `json:"amount"`   // in paise
	Currency string `json:"currency"` // "INR"
	Receipt  string `json:"receipt"`
}

type razorpayOrderResponse struct {
	ID       string `json:"id"`
	Status   string `json:"status"`
	Amount   int64  `json:"amount"`
	Currency string `json:"currency"`
	Receipt  string `json:"receipt"`
	Error    *struct {
		Code        string `json:"code"`
		Description string `json:"description"`
	} `json:"error,omitempty"`
}

type razorpayRefundRequest struct {
	Amount int64 `json:"amount"` // in paise
}

// ─── Charge ─────────────────────────────────────────────────────────────────

// Charge creates a Razorpay order via the real REST API.
// The order ID is returned as the ProviderTransactionID, which the
// frontend uses to open the Razorpay Checkout popup.
func (r *RazorpayProvider) Charge(ctx context.Context, amount decimal.Decimal, currency, method, orderID string) (*ChargeResult, error) {
	if r.keyID == "" || r.keySecret == "" {
		// Fallback simulation when keys not configured
		r.logger.Warnw("Razorpay: no credentials configured, using simulation", "order", orderID)
		return r.simulateCharge(orderID)
	}

	if currency == "" {
		currency = "INR"
	}

	// Razorpay uses paise (1 INR = 100 paise)
	amountPaise := amount.Mul(decimal.NewFromInt(100)).IntPart()

	payload := razorpayOrderRequest{
		Amount:   amountPaise,
		Currency: currency,
		Receipt:  orderID,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("razorpay: marshal error: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.razorpay.com/v1/orders", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("razorpay: request build error: %w", err)
	}
	req.SetBasicAuth(r.keyID, r.keySecret)
	req.Header.Set("Content-Type", "application/json")

	resp, err := r.client.Do(req)
	if err != nil {
		r.logger.Errorw("Razorpay API call failed", "error", err, "order", orderID)
		return nil, fmt.Errorf("razorpay: API call failed: %w", err)
	}
	defer resp.Body.Close()

	respBytes, _ := io.ReadAll(resp.Body)

	var orderResp razorpayOrderResponse
	if err := json.Unmarshal(respBytes, &orderResp); err != nil {
		return nil, fmt.Errorf("razorpay: decode error: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		errMsg := "unknown error"
		if orderResp.Error != nil {
			errMsg = orderResp.Error.Description
		}
		r.logger.Errorw("Razorpay order creation failed", "status", resp.StatusCode, "error", errMsg, "order", orderID)
		return nil, fmt.Errorf("razorpay: order creation failed: %s", errMsg)
	}

	r.logger.Infow("Razorpay order created", "razorpay_order_id", orderResp.ID, "amount_paise", amountPaise)

	return &ChargeResult{
		ProviderTransactionID: orderResp.ID,
		Status:                "created", // Razorpay orders start as "created", payment pending
		ReceiptURL:            fmt.Sprintf("https://dashboard.razorpay.com/app/orders/%s", orderResp.ID),
	}, nil
}

// ─── Refund ──────────────────────────────────────────────────────────────────

func (r *RazorpayProvider) Refund(ctx context.Context, amount decimal.Decimal, transactionID string) error {
	if r.keyID == "" || r.keySecret == "" {
		r.logger.Warnw("Razorpay refund: no credentials, simulating", "txn", transactionID)
		return nil
	}

	amountPaise := amount.Mul(decimal.NewFromInt(100)).IntPart()
	payload := razorpayRefundRequest{Amount: amountPaise}

	body, _ := json.Marshal(payload)
	url := fmt.Sprintf("https://api.razorpay.com/v1/payments/%s/refund", transactionID)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("razorpay refund: request error: %w", err)
	}
	req.SetBasicAuth(r.keyID, r.keySecret)
	req.Header.Set("Content-Type", "application/json")

	resp, err := r.client.Do(req)
	if err != nil {
		return fmt.Errorf("razorpay refund: API error: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("razorpay refund failed: status=%d body=%s", resp.StatusCode, string(respBytes))
	}

	r.logger.Infow("Razorpay refund initiated", "payment_id", transactionID, "amount_paise", amountPaise)
	return nil
}

// ─── Check Status ────────────────────────────────────────────────────────────

func (r *RazorpayProvider) CheckStatus(ctx context.Context, transactionID string) (string, error) {
	if r.keyID == "" || r.keySecret == "" {
		return "success", nil
	}

	url := fmt.Sprintf("https://api.razorpay.com/v1/payments/%s", transactionID)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return "", err
	}
	req.SetBasicAuth(r.keyID, r.keySecret)

	resp, err := r.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var result struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}

	// Map Razorpay status → internal status
	switch result.Status {
	case "captured":
		return "success", nil
	case "failed":
		return "failed", nil
	case "refunded":
		return "refunded", nil
	default:
		return "pending", nil
	}
}

// ─── Simulation fallback ─────────────────────────────────────────────────────

func (r *RazorpayProvider) simulateCharge(orderID string) (*ChargeResult, error) {
	pid := fmt.Sprintf("order_sim_%s", orderID[:8])
	return &ChargeResult{
		ProviderTransactionID: pid,
		Status:                "created",
		ReceiptURL:            fmt.Sprintf("https://dashboard.razorpay.com/app/orders/%s", pid),
	}, nil
}
