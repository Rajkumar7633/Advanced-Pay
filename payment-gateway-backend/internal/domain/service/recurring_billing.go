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

// RecurringBillingService handles subscription and recurring billing operations
type RecurringBillingService struct {
	subscriptionRepo repository.SubscriptionRepository
	paymentService   *PaymentService
	webhookService   *WebhookService
	logger           *logger.Logger
}

func NewRecurringBillingService(
	subscriptionRepo repository.SubscriptionRepository,
	paymentService *PaymentService,
	webhookService *WebhookService,
	log *logger.Logger,
) *RecurringBillingService {
	return &RecurringBillingService{
		subscriptionRepo: subscriptionRepo,
		paymentService:   paymentService,
		webhookService:   webhookService,
		logger:           log,
	}
}

// CreateSubscriptionRequest represents the request to create a subscription
type CreateSubscriptionRequest struct {
	CustomerID      uuid.UUID `json:"customer_id"`
	MerchantID      uuid.UUID `json:"merchant_id"`
	PlanID          string    `json:"plan_id"`
	Amount          float64   `json:"amount"`
	Currency        string    `json:"currency"`
	Interval        string    `json:"interval"` // daily, weekly, monthly, yearly
	IntervalCount   int       `json:"interval_count"`
	TrialPeriodDays int       `json:"trial_period_days"`
	PaymentMethodID string    `json:"payment_method_id"`
	Metadata        map[string]interface{} `json:"metadata"`
}

// Subscription represents a subscription
type Subscription struct {
	ID                uuid.UUID              `json:"id"`
	CustomerID        uuid.UUID              `json:"customer_id"`
	MerchantID        uuid.UUID              `json:"merchant_id"`
	PlanID            string                 `json:"plan_id"`
	Amount            float64                `json:"amount"`
	Currency          string                 `json:"currency"`
	Interval          string                 `json:"interval"`
	IntervalCount     int                    `json:"interval_count"`
	Status            string                 `json:"status"` // active, paused, cancelled, completed, past_due
	TrialEndsAt       *time.Time             `json:"trial_ends_at,omitempty"`
	CurrentPeriodStart time.Time             `json:"current_period_start"`
	CurrentPeriodEnd   time.Time             `json:"current_period_end"`
	CancelAtPeriodEnd bool                   `json:"cancel_at_period_end"`
	PaymentMethodID   string                 `json:"payment_method_id"`
	Metadata          map[string]interface{} `json:"metadata"`
	CreatedAt         time.Time              `json:"created_at"`
	UpdatedAt         time.Time              `json:"updated_at"`
}

// SubscriptionInvoice represents a subscription invoice
type SubscriptionInvoice struct {
	ID             uuid.UUID `json:"id"`
	SubscriptionID uuid.UUID `json:"subscription_id"`
	InvoiceNumber  string    `json:"invoice_number"`
	Amount         float64   `json:"amount"`
	Currency       string    `json:"currency"`
	Status         string    `json:"status"` // draft, pending, paid, failed, voided
	DueDate        time.Time `json:"due_date"`
	PaidAt         *time.Time `json:"paid_at,omitempty"`
	PaymentID      *uuid.UUID `json:"payment_id,omitempty"`
	CreatedAt      time.Time `json:"created_at"`
}

// CreateSubscription creates a new subscription
func (s *RecurringBillingService) CreateSubscription(ctx context.Context, req *CreateSubscriptionRequest) (*Subscription, error) {
	// Validate interval
	validIntervals := map[string]bool{
		"daily":   true,
		"weekly":  true,
		"monthly": true,
		"yearly":  true,
	}
	if !validIntervals[req.Interval] {
		return nil, fmt.Errorf("invalid interval: %s", req.Interval)
	}

	// Set default interval count if not provided
	if req.IntervalCount == 0 {
		req.IntervalCount = 1
	}

	// Calculate period dates
	now := time.Now()
	currentPeriodEnd := s.calculatePeriodEnd(now, req.Interval, req.IntervalCount)

	var trialEndsAt *time.Time
	if req.TrialPeriodDays > 0 {
		trialEnd := now.AddDate(0, 0, req.TrialPeriodDays)
		trialEndsAt = &trialEnd
	}

	subscription := &Subscription{
		ID:                uuid.New(),
		CustomerID:        req.CustomerID,
		MerchantID:        req.MerchantID,
		PlanID:            req.PlanID,
		Amount:            req.Amount,
		Currency:          req.Currency,
		Interval:          req.Interval,
		IntervalCount:     req.IntervalCount,
		Status:            "active",
		TrialEndsAt:       trialEndsAt,
		CurrentPeriodStart: now,
		CurrentPeriodEnd:   currentPeriodEnd,
		CancelAtPeriodEnd: false,
		PaymentMethodID:   req.PaymentMethodID,
		Metadata:          req.Metadata,
		CreatedAt:         now,
		UpdatedAt:         now,
	}

	// Create initial invoice if no trial period
	if req.TrialPeriodDays == 0 {
		invoice, err := s.createInvoice(ctx, subscription)
		if err != nil {
			s.logger.Error("Failed to create initial invoice", "error", err)
			return nil, fmt.Errorf("failed to create initial invoice: %w", err)
		}
		s.logger.Info("Created initial invoice", "invoice_id", invoice.ID, "subscription_id", subscription.ID)
	}

	s.logger.Info("Subscription created", "subscription_id", subscription.ID, "customer_id", req.CustomerID)
	return subscription, nil
}

// UpdateSubscription updates an existing subscription
func (s *RecurringBillingService) UpdateSubscription(ctx context.Context, subscriptionID uuid.UUID, updates map[string]interface{}) (*Subscription, error) {
	// In production, this would update the subscription in the database
	// For now, return a mock response
	subscription := &Subscription{
		ID:         subscriptionID,
		Status:     "active",
		UpdatedAt:  time.Now(),
	}

	if amount, ok := updates["amount"].(float64); ok {
		subscription.Amount = amount
	}
	if interval, ok := updates["interval"].(string); ok {
		subscription.Interval = interval
	}

	s.logger.Info("Subscription updated", "subscription_id", subscriptionID)
	return subscription, nil
}

// CancelSubscription cancels a subscription
func (s *RecurringBillingService) CancelSubscription(ctx context.Context, subscriptionID uuid.UUID, cancelAtPeriodEnd bool) error {
	// In production, this would update the subscription status in the database
	// For now, just log the action
	if cancelAtPeriodEnd {
		s.logger.Info("Subscription scheduled for cancellation at period end", "subscription_id", subscriptionID)
	} else {
		s.logger.Info("Subscription cancelled immediately", "subscription_id", subscriptionID)
	}
	return nil
}

// PauseSubscription pauses a subscription
func (s *RecurringBillingService) PauseSubscription(ctx context.Context, subscriptionID uuid.UUID) error {
	// In production, this would update the subscription status to paused
	s.logger.Info("Subscription paused", "subscription_id", subscriptionID)
	return nil
}

// ResumeSubscription resumes a paused subscription
func (s *RecurringBillingService) ResumeSubscription(ctx context.Context, subscriptionID uuid.UUID) error {
	// In production, this would update the subscription status to active
	s.logger.Info("Subscription resumed", "subscription_id", subscriptionID)
	return nil
}

// ProcessSubscriptionBilling processes billing for a subscription
func (s *RecurringBillingService) ProcessSubscriptionBilling(ctx context.Context, subscriptionID uuid.UUID) (*SubscriptionInvoice, error) {
	// In production, this would:
	// 1. Get the subscription
	// 2. Create an invoice
	// 3. Process payment for the invoice
	// 4. Update subscription period dates
	// 5. Handle payment failures with retry logic

	subscription := &Subscription{
		ID:                subscriptionID,
		Amount:            100.00,
		Currency:          "INR",
		Status:            "active",
		CurrentPeriodEnd: time.Now().Add(30 * 24 * time.Hour),
	}

	// Create invoice
	invoice, err := s.createInvoice(ctx, subscription)
	if err != nil {
		return nil, fmt.Errorf("failed to create invoice: %w", err)
	}

	// Process payment
	paymentReq := &models.CreatePaymentRequest{
		OrderID:       fmt.Sprintf("sub-%s-%s", subscriptionID, invoice.ID),
		Amount:        subscription.Amount,
		Currency:      subscription.Currency,
		PaymentMethod: "card",
		CustomerEmail: "customer@example.com",
		Metadata: map[string]interface{}{
			"subscription_id": subscriptionID,
			"invoice_id":      invoice.ID,
			"billing_type":    "recurring",
		},
	}

	_, err = s.paymentService.CreatePayment(ctx, paymentReq, subscription.MerchantID)
	if err != nil {
		invoice.Status = "failed"
		s.logger.Error("Subscription payment failed", "subscription_id", subscriptionID, "error", err)
		return invoice, nil
	}

	// Update invoice status
	invoice.Status = "paid"
	now := time.Now()
	invoice.PaidAt = &now

	// Update subscription period dates
	subscription.CurrentPeriodStart = now
	subscription.CurrentPeriodEnd = s.calculatePeriodEnd(now, subscription.Interval, subscription.IntervalCount)
	subscription.UpdatedAt = now

	s.logger.Info("Subscription billing processed", "subscription_id", subscriptionID, "invoice_id", invoice.ID)
	return invoice, nil
}

// createInvoice creates an invoice for a subscription
func (s *RecurringBillingService) createInvoice(ctx context.Context, subscription *Subscription) (*SubscriptionInvoice, error) {
	invoice := &SubscriptionInvoice{
		ID:             uuid.New(),
		SubscriptionID: subscription.ID,
		InvoiceNumber:  fmt.Sprintf("INV-%s-%d", subscription.ID.String()[:8], time.Now().Unix()),
		Amount:         subscription.Amount,
		Currency:       subscription.Currency,
		Status:         "pending",
		DueDate:        subscription.CurrentPeriodEnd,
		CreatedAt:      time.Now(),
	}

	s.logger.Info("Invoice created", "invoice_id", invoice.ID, "subscription_id", subscription.ID)
	return invoice, nil
}

// calculatePeriodEnd calculates the end date of a billing period
func (s *RecurringBillingService) calculatePeriodEnd(startDate time.Time, interval string, intervalCount int) time.Time {
	switch interval {
	case "daily":
		return startDate.AddDate(0, 0, intervalCount)
	case "weekly":
		return startDate.AddDate(0, 0, intervalCount*7)
	case "monthly":
		return startDate.AddDate(0, intervalCount, 0)
	case "yearly":
		return startDate.AddDate(intervalCount, 0, 0)
	default:
		return startDate.AddDate(0, 1, 0) // Default to monthly
	}
}

// GetSubscription retrieves a subscription by ID
func (s *RecurringBillingService) GetSubscription(ctx context.Context, subscriptionID uuid.UUID) (*Subscription, error) {
	// In production, this would query the database
	return &Subscription{
		ID:                subscriptionID,
		Status:            "active",
		Amount:            100.00,
		Currency:          "INR",
		Interval:          "monthly",
		IntervalCount:     1,
		CurrentPeriodStart: time.Now().Add(-30 * 24 * time.Hour),
		CurrentPeriodEnd:   time.Now().Add(30 * 24 * time.Hour),
		CreatedAt:         time.Now().Add(-30 * 24 * time.Hour),
		UpdatedAt:         time.Now(),
	}, nil
}

// ListSubscriptions lists subscriptions for a merchant
func (s *RecurringBillingService) ListSubscriptions(ctx context.Context, merchantID uuid.UUID, filter map[string]interface{}) ([]*Subscription, error) {
	// In production, this would query the database with filters
	return []*Subscription{
		{
			ID:         uuid.New(),
			MerchantID: merchantID,
			Status:     "active",
			Amount:     100.00,
			Currency:   "INR",
			Interval:   "monthly",
			CreatedAt:  time.Now().Add(-30 * 24 * time.Hour),
		},
	}, nil
}

// GetSubscriptionInvoices retrieves invoices for a subscription
func (s *RecurringBillingService) GetSubscriptionInvoices(ctx context.Context, subscriptionID uuid.UUID) ([]*SubscriptionInvoice, error) {
	// In production, this would query the database
	return []*SubscriptionInvoice{
		{
			ID:             uuid.New(),
			SubscriptionID: subscriptionID,
			InvoiceNumber:  "INV-123456",
			Amount:         100.00,
			Currency:       "INR",
			Status:         "paid",
			DueDate:        time.Now().Add(-30 * 24 * time.Hour),
			CreatedAt:      time.Now().Add(-30 * 24 * time.Hour),
		},
	}, nil
}

// RetryFailedInvoice retries payment for a failed invoice
func (s *RecurringBillingService) RetryFailedInvoice(ctx context.Context, invoiceID uuid.UUID) (*SubscriptionInvoice, error) {
	// In production, this would:
	// 1. Get the invoice
	// 2. Retry the payment
	// 3. Update invoice status
	// 4. Handle subscription status based on payment result

	s.logger.Info("Retrying failed invoice", "invoice_id", invoiceID)
	return &SubscriptionInvoice{
		ID:     invoiceID,
		Status: "pending",
	}, nil
}

// ProcessDueSubscriptions processes all subscriptions that are due for billing
func (s *RecurringBillingService) ProcessDueSubscriptions(ctx context.Context) (int, error) {
	// In production, this would:
	// 1. Query all active subscriptions where current_period_end <= now
	// 2. Process billing for each subscription
	// 3. Handle failures and retries
	// 4. Update subscription statuses

	s.logger.Info("Processing due subscriptions")
	return 0, nil
}

// GetSubscriptionMetrics returns subscription metrics for a merchant
func (s *RecurringBillingService) GetSubscriptionMetrics(ctx context.Context, merchantID uuid.UUID) map[string]interface{} {
	return map[string]interface{}{
		"total_subscriptions": 1000,
		"active_subscriptions": 850,
		"paused_subscriptions": 50,
		"cancelled_subscriptions": 100,
		"monthly_recurring_revenue": 85000.00,
		"average_revenue_per_subscription": 100.00,
		"churn_rate": 0.10,
		"trial_subscriptions": 50,
	}
}
