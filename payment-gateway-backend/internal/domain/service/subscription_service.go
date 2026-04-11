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

type SubscriptionService struct {
	repo   repository.SubscriptionRepository
	logger *logger.Logger
}

func NewSubscriptionService(repo repository.SubscriptionRepository, logger *logger.Logger) *SubscriptionService {
	return &SubscriptionService{
		repo:   repo,
		logger: logger,
	}
}

func (s *SubscriptionService) CreatePlan(ctx context.Context, merchantID uuid.UUID, name, desc string, amount float64, currency string, intervalType string, intervalCount int) (*models.SubscriptionPlan, error) {
	amountDec, _ := decimal.NewFromString(fmt.Sprintf("%.2f", amount))
	
	plan := &models.SubscriptionPlan{
		ID:            uuid.New(),
		MerchantID:    merchantID,
		Name:          name,
		Description:   desc,
		Amount:        amountDec,
		Currency:      currency,
		IntervalType:  intervalType,
		IntervalCount: intervalCount,
		IsActive:      true,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	if err := s.repo.CreatePlan(ctx, plan); err != nil {
		s.logger.Error("Failed to create subscription plan", "error", err)
		return nil, err
	}

	return plan, nil
}

func (s *SubscriptionService) GetPlan(ctx context.Context, merchantID, planID uuid.UUID) (*models.SubscriptionPlan, error) {
	return s.repo.GetPlan(ctx, merchantID, planID)
}

func (s *SubscriptionService) ListPlans(ctx context.Context, merchantID uuid.UUID) ([]*models.SubscriptionPlan, error) {
	return s.repo.ListPlans(ctx, merchantID)
}

func (s *SubscriptionService) CreateSubscription(ctx context.Context, merchantID, planID uuid.UUID, opts models.CreateSubscriptionOptions) (*models.Subscription, error) {
	plan, err := s.repo.GetPlan(ctx, merchantID, planID)
	if err != nil {
		return nil, fmt.Errorf("invalid plan: %w", err)
	}

	if !plan.IsActive {
		return nil, fmt.Errorf("plan is inactive")
	}

	now := time.Now()
	nextBilling := CalculateNextBillingDate(now, plan.IntervalType, plan.IntervalCount)

	sub := &models.Subscription{
		ID:                 uuid.New(),
		MerchantID:         merchantID,
		PlanID:             planID,
		CustomerEmail:      opts.CustomerEmail,
		CustomerPhone:      opts.CustomerPhone,
		Status:             models.SubscriptionStatusIncomplete,
		CurrentPeriodStart: now,
		CurrentPeriodEnd:   nextBilling,
		Metadata:           opts.Metadata,
		CreatedAt:          now,
		UpdatedAt:          now,
	}

	if err := s.repo.CreateSubscription(ctx, sub); err != nil {
		s.logger.Error("Failed to create subscription", "error", err)
		return nil, err
	}

	return sub, nil
}

func (s *SubscriptionService) CancelSubscription(ctx context.Context, merchantID, subID uuid.UUID) error {
	sub, err := s.repo.GetSubscription(ctx, merchantID, subID)
	if err != nil {
		return err
	}

	now := time.Now()
	sub.Status = models.SubscriptionStatusCanceled
	sub.CanceledAt = &now
	sub.NextBillingDate = nil
	sub.UpdatedAt = now

	return s.repo.UpdateSubscription(ctx, sub)
}

func (s *SubscriptionService) GetSubscription(ctx context.Context, merchantID, subID uuid.UUID) (*models.Subscription, error) {
	return s.repo.GetSubscription(ctx, merchantID, subID)
}

func (s *SubscriptionService) ListSubscriptions(ctx context.Context, merchantID uuid.UUID) ([]*models.Subscription, error) {
	return s.repo.ListSubscriptions(ctx, merchantID)
}

// CalculateNextBillingDate computes the precise time for the next cycle
func CalculateNextBillingDate(start time.Time, intervalType string, count int) time.Time {
	switch intervalType {
	case "daily":
		return start.AddDate(0, 0, count)
	case "weekly":
		return start.AddDate(0, 0, count*7)
	case "monthly":
		return start.AddDate(0, count, 0)
	case "yearly":
		return start.AddDate(count, 0, 0)
	default:
		// Fallback safe default (1 month)
		return start.AddDate(0, 1, 0)
	}
}
