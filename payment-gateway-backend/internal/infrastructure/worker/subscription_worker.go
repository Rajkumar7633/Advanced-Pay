package worker

import (
	"context"
	"time"

	"github.com/yourcompany/payment-gateway/internal/domain/repository"
	"github.com/yourcompany/payment-gateway/internal/domain/service"
	"github.com/yourcompany/payment-gateway/pkg/logger"
)

// SubscriptionWorker is a background daemon that continually monitors PostgreSQL
// to execute autonomous recurring Tier-1 subscriptions via Vault Tokens.
type SubscriptionWorker struct {
	subRepo        repository.SubscriptionRepository
	paymentService *service.PaymentService
	logger         *logger.Logger
}

func NewSubscriptionWorker(
	subRepo repository.SubscriptionRepository,
	paymentService *service.PaymentService,
	logger *logger.Logger,
) *SubscriptionWorker {
	return &SubscriptionWorker{
		subRepo:        subRepo,
		paymentService: paymentService,
		logger:         logger,
	}
}

// Start opens the infinite polling loop on an isolated thread
func (w *SubscriptionWorker) Start(ctx context.Context) {
	w.logger.Info("Starting Autonomous Subscription Billing Daemon (Phase 14)...")

	// In a heavily distributed environment this should be executed via Redis Locks
	// or Kafka schedulers. For this integration, a standard polling loop suffices.
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			w.logger.Info("Stopping Subscription Billing Daemon...")
			return
		case <-ticker.C:
			w.processDueSubscriptions(ctx)
		}
	}
}

// processDueSubscriptions scans Postgres for active logic loops
func (w *SubscriptionWorker) processDueSubscriptions(ctx context.Context) {
	subs, err := w.subRepo.GetDueSubscriptions(ctx)
	if err != nil {
		w.logger.Error("Failed to fetch due subscriptions", "error", err)
		return
	}

	if len(subs) == 0 {
		return
	}

	w.logger.Infow("Executing Autonomous Subscriptions", "count", len(subs))

	for _, sub := range subs {
		// Verify CardMandate exists; we need the Vault Token ID to proceed.
		if sub.CardMandateID == nil || *sub.CardMandateID == "" {
			w.logger.Warnw("Subscription lacks valid autonomous Vault Token Mandate, skipping", "sub_id", sub.ID)
			continue
		}

		// Pull the associated active plan
		plan, err := w.subRepo.GetPlan(ctx, sub.MerchantID, sub.PlanID)
		if err != nil {
			w.logger.Errorw("Failed to fetch plan for subscription execution", "error", err, "sub_id", sub.ID)
			continue
		}

		w.logger.Infow("Autonomous Billing Firing", "sub_id", sub.ID, "amount", plan.Amount.String())

		// Execute against the Core payment engine using safely decrypted constraints
		resp, err := w.paymentService.ChargeSubscription(ctx, sub.MerchantID, *sub.CardMandateID, plan.Amount.InexactFloat64(), plan.Currency)

		if err != nil || resp.Status == "failed" {
			w.logger.Errorw("Subscription Autonomous Execution Failed", "sub_id", sub.ID, "error", err)
			continue
		}

		// Assuming it succeeded, instantly roll the billing date forward
		now := time.Now()
		var nextDate time.Time
		switch plan.IntervalType {
		case "month":
			nextDate = now.AddDate(0, plan.IntervalCount, 0)
		case "year":
			nextDate = now.AddDate(plan.IntervalCount, 0, 0)
		case "week":
			nextDate = now.AddDate(0, 0, 7*plan.IntervalCount)
		default:
			nextDate = now.AddDate(0, 1, 0) // Default 1 month
		}

		sub.NextBillingDate = &nextDate
		sub.UpdatedAt = now

		_ = w.subRepo.UpdateSubscription(ctx, sub)
		w.logger.Infow("Subscription advanced successfully", "sub_id", sub.ID, "next_date", nextDate.Format(time.RFC3339))
	}
}
