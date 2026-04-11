package service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/yourcompany/payment-gateway/internal/domain/models"
	"github.com/yourcompany/payment-gateway/internal/domain/repository"
	"github.com/yourcompany/payment-gateway/internal/infrastructure/cache"
	"github.com/yourcompany/payment-gateway/internal/infrastructure/circuitbreaker"
	"github.com/yourcompany/payment-gateway/internal/infrastructure/providers"
	"github.com/yourcompany/payment-gateway/internal/infrastructure/queue"
	"github.com/yourcompany/payment-gateway/internal/infrastructure/websocket"
	"github.com/yourcompany/payment-gateway/pkg/forex"
	"github.com/yourcompany/payment-gateway/pkg/logger"
)

// PaymentService handles payment business logic
type PaymentService struct {
	paymentRepo     repository.PaymentRepository
	transactionRepo repository.TransactionRepository
	refundRepo      repository.RefundRepository
	producer        queue.Producer
	cache           cache.Client
	routingService  *RoutingService
	fraudService    *FraudService
	vaultService    *VaultService
	fxService       *forex.ForexService
	pulseHub        *websocket.Hub
	webhooks        *WebhookService
	logger          *logger.Logger

	processors map[string]providers.PaymentProcessor
	breakers   map[string]*circuitbreaker.CircuitBreaker
}

// NewPaymentService creates a new payment service
func NewPaymentService(
	paymentRepo repository.PaymentRepository,
	transactionRepo repository.TransactionRepository,
	refundRepo repository.RefundRepository,
	producer queue.Producer,
	cacheClient cache.Client,
	webhookService *WebhookService,
	fraudService *FraudService,
	vaultService *VaultService,
	pulseHub *websocket.Hub,
	logger *logger.Logger,
) *PaymentService {
	return &PaymentService{
		paymentRepo:     paymentRepo,
		transactionRepo: transactionRepo,
		refundRepo:      refundRepo,
		producer:        producer,
		cache:           cacheClient,
		routingService:  NewRoutingService("http://localhost:8000", logger),
		fraudService:    fraudService,
		vaultService:    vaultService,
		fxService:       forex.NewForexService(""),
		pulseHub:        pulseHub,
		webhooks:        webhookService,
		logger:          logger,
		processors: map[string]providers.PaymentProcessor{
			"razorpay": providers.NewRazorpayMock(logger),
			"stripe":   providers.NewStripeMock(logger),
			"npci":     providers.NewNPCIProcessor(logger),
		},
		breakers: map[string]*circuitbreaker.CircuitBreaker{
			"razorpay": circuitbreaker.NewCircuitBreaker("razorpay", 3, 30*time.Second, logger),
			"stripe":   circuitbreaker.NewCircuitBreaker("stripe", 3, 30*time.Second, logger),
			"npci":     circuitbreaker.NewCircuitBreaker("npci", 3, 30*time.Second, logger),
		},
	}
}

// CreatePayment creates a new payment transaction
func (s *PaymentService) CreatePayment(ctx context.Context, req *models.CreatePaymentRequest, merchantID uuid.UUID) (*models.CreatePaymentResponse, error) {
	// Validate idempotency
	idempotencyKey := fmt.Sprintf("payment:%s:%s", merchantID.String(), req.OrderID)
	if s.cache != nil {
		exists, err := s.cache.Exists(ctx, idempotencyKey)
		if err != nil {
			s.logger.Error("Failed to check idempotency", "error", err)
		}
		if exists {
			// Return existing transaction
			tx, err := s.transactionRepo.GetByOrderID(ctx, merchantID, req.OrderID)
			if err == nil {
				return s.buildPaymentResponse(tx), nil
			}
		}
	}

	// Create transaction
	txID := uuid.New()
	now := time.Now()

	amount := decimal.NewFromFloat(req.Amount)
	now = time.Now()

	// FX Multi-Currency Conversion
	baseAmount, fxRate, err := s.fxService.Convert(amount, req.Currency)
	if err != nil {
		s.logger.Error("Multi-Currency FX routing exception", "error", err, "currency", req.Currency)
		return nil, fmt.Errorf("failed to route unsupported international currency pairing")
	}

	txID = uuid.New()
	transaction := &models.Transaction{
		ID:            txID,
		MerchantID:    merchantID,
		OrderID:       req.OrderID,
		Amount:        amount,
		Currency:      req.Currency,
		BaseAmount:    &baseAmount,
		ExchangeRate:  &fxRate,
		Status:        models.TransactionStatusInitiated,
		PaymentMethod: req.PaymentMethod,
		CustomerEmail: req.CustomerEmail,
		CustomerPhone: req.CustomerPhone,
		Metadata:      req.Metadata,
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	// Tier-1 baseline: AI Routing decision + fraud score (ML)
	isRecurring := false
	if req.Metadata["is_recurring"] == "true" {
		isRecurring = true
	}
	decision := s.routingService.Decide(req.Amount, req.PaymentMethod, isRecurring)
	transaction.PaymentProvider = decision.Provider
	transaction.RoutingDecision = map[string]interface{}{
		"provider":     decision.Provider,
		"confidence":   decision.Confidence,
		"factors":      decision.Factors,
		"meta":         decision.Meta,
		"generated_at": decision.GeneratedAt,
	}

	fraud := s.fraudService.Score(req.Amount, req.PaymentMethod, req.CustomerEmail, req.CustomerPhone, transaction.DeviceFingerprint)
	transaction.FraudScore = &fraud.Score
	
	transaction.RoutingDecision["fraud_factors"] = fraud.Factors
	transaction.RoutingDecision["fraud_model"] = fraud.Model

	// AI Predictve Fraud Circuit Breaker
	if fraud.Score >= 85 {
		s.logger.Warnw("AI Fraud Engine blocked transaction autonomously", "score", fraud.Score, "transaction_id", txID.String(), "factors", fraud.Factors)
		
		transaction.Status = models.TransactionStatusFailed
		transaction.Metadata["fraud_blocked"] = true
		transaction.Metadata["declined_reason"] = "High Risk Identified"

		// Save blocked transaction to database for auditing
		if err := s.transactionRepo.Create(ctx, transaction); err != nil {
			s.logger.Error("Failed to store fraud blocked transaction", "error", err)
		}

		return nil, fmt.Errorf("transaction declined: predictive risk evaluation failed (Score: %d)", fraud.Score)
	}

	var chargeResult *providers.ChargeResult
	var chargeErr error

	// Just-In-Time 1-Click Vault Routing
	if req.PaymentMethod == "card_token" {
		if tokenInterface, ok := req.Metadata["token_id"]; ok {
			s.logger.Infow("1-Click Vault Decryption pipeline triggered", "token_id", tokenInterface)
			_, decryptedPan, err := s.vaultService.RevealPAN(ctx, merchantID, fmt.Sprintf("%v", tokenInterface))
			if err != nil {
				s.logger.Error("Vault rehydration failed", "error", err)
				return nil, fmt.Errorf("token vault processing error: %w", err)
			}
			
			// Obfuscated simulated mapping for the charge
			req.Metadata["obfuscated_decrypted_pan_length"] = len(decryptedPan)
		} else {
			return nil, fmt.Errorf("metadata.token_id is required for card_token payment methods")
		}
	}

	execCharge := func(providerName string) error {
		p, ok := s.processors[providerName]
		if !ok {
			return fmt.Errorf("provider %s not configured", providerName)
		}

		cb, ok := s.breakers[providerName]
		if !ok {
			// No CB, just execute
			res, err := p.Charge(ctx, amount, req.Currency, req.PaymentMethod, req.OrderID)
			if err == nil {
				chargeResult = res
			}
			return err
		}

		return cb.Execute(func() error {
			res, err := p.Charge(ctx, amount, req.Currency, req.PaymentMethod, req.OrderID)
			if err != nil {
				return err
			}
			chargeResult = res
			return nil
		})
	}

	primaryProvider := decision.Provider
	s.logger.Infow("Executing payment with primary provider", "provider", primaryProvider, "order", req.OrderID)
	
	chargeErr = execCharge(primaryProvider)
	finalProvider := primaryProvider

	if chargeErr != nil {
		s.logger.Warnw("Primary provider failed, evaluating circuit breaker failover", "provider", primaryProvider, "error", chargeErr)
		
		// Fallback Engine Logic
		secondaryProvider := "stripe"
		if primaryProvider == "stripe" {
			secondaryProvider = "razorpay"
		}

		s.logger.Warnw("Zero-Downtime Failover Initiated -> trying secondary", "secondary", secondaryProvider)
		chargeErr = execCharge(secondaryProvider)
		
		if chargeErr != nil {
			s.logger.Error("Secondary provider ALSO failed. Transaction fully declined.", "error", chargeErr)
			
			// Emit transaction.failed webhook
			transaction.Status = models.TransactionStatusFailed
			if s.webhooks != nil {
				_ = s.webhooks.EnqueueTransactionEvent(ctx, merchantID, "transaction.failed", txID, map[string]interface{}{
					"transaction_id": txID.String(),
					"status":         transaction.Status,
					"reason":         chargeErr.Error(),
					"timestamp":      now.Unix(),
				})
			}
			
			// Technically we fail entirely before saving the transaction, 
			// so the merchant won't see it but they WILL get the webhook.
			return nil, fmt.Errorf("payment execution failed across all providers: %w", chargeErr)
		}
		
		finalProvider = secondaryProvider
	}

	transaction.PaymentProvider = finalProvider
	if transaction.RoutingDecision == nil {
		transaction.RoutingDecision = make(map[string]interface{})
	}
	transaction.RoutingDecision["final_provider"] = finalProvider
	transaction.RoutingDecision["failover_used"] = finalProvider != primaryProvider

	if chargeResult != nil {
		if transaction.Metadata == nil {
			transaction.Metadata = make(map[string]interface{})
		}
		if req.PaymentMethod == "card" && req.Amount >= 5000.00 {
			transaction.Status = models.TransactionStatusRequiresAction
			transaction.Metadata["requires_3ds"] = "true"
			transaction.Metadata["3ds_redirect_url"] = "https://mock-bank.advancedpay.com/3ds/verify"
			s.logger.Infow("3D Secure Authentication Required", "transaction_id", txID.String())
		} else {
			transaction.Status = models.TransactionStatusProcessing
		}
		transaction.Metadata["provider_txn_id"] = chargeResult.ProviderTransactionID
		transaction.Metadata["receipt_url"] = chargeResult.ReceiptURL
	}

	// Save transaction to database
	if err := s.transactionRepo.Create(ctx, transaction); err != nil {
		s.logger.Error("Failed to create transaction", "error", err)
		return nil, fmt.Errorf("failed to create transaction: %w", err)
	}

	// 15.2 Autonomous Marketplace Split Engine
	// If the merchant passed "split_vendor_account" inside mapping, run the Stripe Connect logic
	if vendorAcc, ok := req.Metadata["split_vendor_account"]; ok {
		feeRate := 10.0 // Default 10% platform fee
		if rate, rateOk := req.Metadata["split_fee_percent"]; rateOk {
			if parsed, parseOk := rate.(float64); parseOk {
				feeRate = parsed
			}
		}
		
		// Spawn isolated routing mapper
		s.logger.Infow("Marketplace split request detected via metadata trigger", "vendor", vendorAcc)
		payoutEngine := NewPayoutService(s.transactionRepo, s.logger)
		_ = payoutEngine.SplitTransaction(ctx, transaction, fmt.Sprintf("%v", vendorAcc), feeRate)
	}

	// Set idempotency key with 24h expiration
	if s.cache != nil {
		_ = s.cache.Set(ctx, idempotencyKey, txID.String(), 24*time.Hour)
	}

	// Publish event to Kafka
	event := map[string]interface{}{
		"event_type":     "transaction.created",
		"transaction_id": txID.String(),
		"merchant_id":    merchantID.String(),
		"amount":         req.Amount,
		"currency":       req.Currency,
		"provider":       finalProvider,
		"timestamp":      now.Unix(),
	}
	if s.producer != nil {
		if err := s.producer.Publish(ctx, "transactions", event); err != nil {
			s.logger.Error("Failed to publish event", "error", err)
		}
	}

	if s.webhooks != nil {
		_ = s.webhooks.EnqueueTransactionEvent(ctx, merchantID, "transaction.created", txID, map[string]interface{}{
			"transaction_id": txID.String(),
			"order_id":       req.OrderID,
			"amount":         req.Amount,
			"currency":       req.Currency,
			"status":         transaction.Status,
			"provider":       finalProvider,
			"timestamp":      now.Unix(),
		})
	}

	s.logger.Info("Payment created", "transaction_id", txID, "merchant_id", merchantID, "provider", finalProvider)

	return s.buildPaymentResponse(transaction), nil
}

// ChargeSubscription represents the Autonomous SaaS billing entrypoint.
// It bypasses the standard UI controls, unpacks the original Vaulted Token securely,
// and routes the billing to the payment pipelines instantly.
func (s *PaymentService) ChargeSubscription(ctx context.Context, merchantID uuid.UUID, vaultTokenID string, planAmount float64, currency string) (*models.CreatePaymentResponse, error) {
	// Reveal the exact vaulted PAN (Zero-Downtime logic Phase 10)
	cardVault, _, err := s.vaultService.RevealPAN(ctx, merchantID, vaultTokenID)
	if err != nil {
		return nil, fmt.Errorf("billing daemon failed to decrypt customer vault mandate: %v", err)
	}

	// Craft the autonomous CreatePaymentRequest
	req := &models.CreatePaymentRequest{
		OrderID:         fmt.Sprintf("sub_%d", time.Now().Unix()),
		Amount:          planAmount,
		Currency:        currency,
		PaymentMethod:   models.PaymentMethodCard,
		CardToken:       vaultTokenID, // Using token bypasses UI elements securely
		CustomerEmail:   "recurring_daemon@system.local",
	}

	// Mark it explicitly as recurring so AI logic routing knows to authorize silently
	req.Metadata = map[string]interface{}{
		"is_recurring": "true",
		"vault_span":   fmt.Sprintf("XXXX-XXXX-XXXX-%s", cardVault.CardLast4),
	}

	return s.CreatePayment(ctx, req, merchantID)
}

// GetPayment retrieves a payment by ID
func (s *PaymentService) GetPayment(ctx context.Context, txID uuid.UUID, merchantID uuid.UUID) (*models.Transaction, error) {
	transaction, err := s.transactionRepo.GetByID(ctx, txID)
	if err != nil {
		return nil, err
	}

	// Verify merchant owns this transaction
	if transaction.MerchantID != merchantID {
		return nil, fmt.Errorf("unauthorized access to transaction")
	}

	return transaction, nil
}

// CapturePayment captures a payment (for two-step payments)
func (s *PaymentService) CapturePayment(ctx context.Context, txID uuid.UUID, merchantID uuid.UUID) error {
	transaction, err := s.GetPayment(ctx, txID, merchantID)
	if err != nil {
		return err
	}

	if transaction.Status != models.TransactionStatusProcessing && transaction.Status != models.TransactionStatusInitiated && transaction.Status != models.TransactionStatusRequiresAction {
		return fmt.Errorf("cannot capture payment in %s status", transaction.Status)
	}

	// Update status to success
	transaction.Status = models.TransactionStatusSuccess
	transaction.UpdatedAt = time.Now()
	now := time.Now()
	transaction.CompletedAt = &now

	if err := s.transactionRepo.Update(ctx, transaction); err != nil {
		return err
	}

	// Publish capture event
	event := map[string]interface{}{
		"event_type":     "transaction.captured",
		"transaction_id": txID.String(),
		"merchant_id":    merchantID.String(),
		"timestamp":      time.Now().Unix(),
	}
	if s.producer != nil {
		_ = s.producer.Publish(ctx, "transactions", event)
	}

	if s.webhooks != nil {
		_ = s.webhooks.EnqueueTransactionEvent(ctx, merchantID, "transaction.success", txID, map[string]interface{}{
			"transaction_id":   txID.String(),
			"status":           transaction.Status,
			"amount":           transaction.Amount.InexactFloat64(),
			"currency":         transaction.Currency,
			"routing_decision": transaction.RoutingDecision,
			"fraud_score":      transaction.FraudScore,
			"timestamp":        time.Now().Unix(),
		})
	}

	if s.pulseHub != nil {
		s.pulseHub.Broadcast <- websocket.PulseMessage{
			MerchantID: merchantID.String(),
			Event:      "PAYMENT_SUCCESS",
			Amount:     transaction.Amount.InexactFloat64(),
			Currency:   transaction.Currency,
			OrderID:    transaction.OrderID,
			Timestamp:  time.Now().Unix(),
		}
	}

	s.logger.Info("Payment captured", "transaction_id", txID)

	return nil
}

// AdminForceCapture captures a payment without knowing the merchantID (for webhooks)
func (s *PaymentService) AdminForceCapture(ctx context.Context, txID uuid.UUID) error {
	transaction, err := s.transactionRepo.GetByID(ctx, txID)
	if err != nil {
		return err
	}

	if transaction.Status != models.TransactionStatusProcessing && transaction.Status != models.TransactionStatusInitiated && transaction.Status != models.TransactionStatusRequiresAction {
		return fmt.Errorf("cannot capture payment in %s status", transaction.Status)
	}

	transaction.Status = models.TransactionStatusSuccess
	transaction.UpdatedAt = time.Now()
	now := time.Now()
	transaction.CompletedAt = &now

	if err := s.transactionRepo.Update(ctx, transaction); err != nil {
		return err
	}

	event := map[string]interface{}{
		"event_type":     "transaction.captured",
		"transaction_id": txID.String(),
		"merchant_id":    transaction.MerchantID.String(),
		"timestamp":      time.Now().Unix(),
	}
	if s.producer != nil {
		_ = s.producer.Publish(ctx, "transactions", event)
	}

	if s.webhooks != nil {
		_ = s.webhooks.EnqueueTransactionEvent(ctx, transaction.MerchantID, "transaction.success", txID, map[string]interface{}{
			"transaction_id":   txID.String(),
			"status":           transaction.Status,
			"amount":           transaction.Amount.InexactFloat64(),
			"currency":         transaction.Currency,
			"routing_decision": transaction.RoutingDecision,
			"fraud_score":      transaction.FraudScore,
			"timestamp":        time.Now().Unix(),
		})
	}

	s.logger.Info("Payment force captured via Webhook", "transaction_id", txID)
	return nil
}

// RefundPayment processes a refund
func (s *PaymentService) RefundPayment(ctx context.Context, txID uuid.UUID, merchantID uuid.UUID, amount float64, reason string, idempotencyKey string) error {
	transaction, err := s.GetPayment(ctx, txID, merchantID)
	if err != nil {
		return err
	}

	if transaction.Status != models.TransactionStatusSuccess {
		return fmt.Errorf("cannot refund payment in %s status", transaction.Status)
	}

	refundAmount, _ := decimal.NewFromString(fmt.Sprintf("%.2f", amount))
	if refundAmount.GreaterThan(transaction.Amount) {
		return fmt.Errorf("refund amount cannot exceed transaction amount")
	}

	if idempotencyKey != "" && s.cache != nil {
		key := fmt.Sprintf("refund:%s:%s:%s", merchantID.String(), txID.String(), idempotencyKey)
		exists, err := s.cache.Exists(ctx, key)
		if err == nil && exists {
			return nil
		}
	}

	// Persist refund record
	now := time.Now()
	if s.refundRepo != nil {
		refund := &models.Refund{
			ID:            uuid.New(),
			TransactionID: txID,
			Amount:        refundAmount,
			Reason:        reason,
			Status:        "processed",
			ProcessedAt:   &now,
			CreatedAt:     now,
		}
		if err := s.refundRepo.Create(ctx, refund); err != nil {
			return err
		}
	}

	// Update transaction status
	transaction.Status = models.TransactionStatusRefunded
	transaction.UpdatedAt = now

	if err := s.transactionRepo.Update(ctx, transaction); err != nil {
		return err
	}

	if idempotencyKey != "" && s.cache != nil {
		key := fmt.Sprintf("refund:%s:%s:%s", merchantID.String(), txID.String(), idempotencyKey)
		_ = s.cache.Set(ctx, key, "1", 24*time.Hour)
	}

	// Publish refund event
	event := map[string]interface{}{
		"event_type":     "transaction.refunded",
		"transaction_id": txID.String(),
		"merchant_id":    merchantID.String(),
		"amount":         amount,
		"reason":         reason,
		"timestamp":      time.Now().Unix(),
	}
	if s.producer != nil {
		_ = s.producer.Publish(ctx, "transactions", event)
	}

	if s.webhooks != nil {
		_ = s.webhooks.EnqueueTransactionEvent(ctx, merchantID, "refund.created", txID, map[string]interface{}{
			"transaction_id": txID.String(),
			"amount":         amount,
			"reason":         reason,
			"timestamp":      time.Now().Unix(),
		})
	}

	s.logger.Info("Payment refunded", "transaction_id", txID, "amount", amount)

	return nil
}

// ListTransactions lists transactions for a merchant
func (s *PaymentService) ListTransactions(ctx context.Context, merchantID uuid.UUID, filters repository.TransactionFilters) ([]*models.Transaction, int64, error) {
	return s.transactionRepo.List(ctx, merchantID, filters)
}

func (s *PaymentService) buildPaymentResponse(tx *models.Transaction) *models.CreatePaymentResponse {
	return &models.CreatePaymentResponse{
		TransactionID: tx.ID.String(),
		OrderID:       tx.OrderID,
		Amount:        tx.Amount.InexactFloat64(),
		Currency:      tx.Currency,
		Status:        tx.Status,
		PaymentURL:    fmt.Sprintf("https://checkout.yourgateway.com/pay/%s", tx.ID.String()),
		CreatedAt:     tx.CreatedAt,
	}
}
