package repository

import (
	"context"
	"database/sql"
	"encoding/json"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/yourcompany/payment-gateway/internal/domain/models"
)

type SubscriptionRepository interface {
	CreatePlan(ctx context.Context, plan *models.SubscriptionPlan) error
	GetPlan(ctx context.Context, merchantID, planID uuid.UUID) (*models.SubscriptionPlan, error)
	ListPlans(ctx context.Context, merchantID uuid.UUID) ([]*models.SubscriptionPlan, error)
	
	CreateSubscription(ctx context.Context, sub *models.Subscription) error
	GetSubscription(ctx context.Context, merchantID, subID uuid.UUID) (*models.Subscription, error)
	UpdateSubscription(ctx context.Context, sub *models.Subscription) error
	ListSubscriptions(ctx context.Context, merchantID uuid.UUID) ([]*models.Subscription, error)
	GetDueSubscriptions(ctx context.Context) ([]*models.Subscription, error)
}

type subscriptionRepository struct {
	db *sqlx.DB
}

func NewSubscriptionRepository(db *sqlx.DB) SubscriptionRepository {
	return &subscriptionRepository{db: db}
}

func (r *subscriptionRepository) CreatePlan(ctx context.Context, plan *models.SubscriptionPlan) error {
	query := `
		INSERT INTO subscription_plans 
		(id, merchant_id, name, description, amount, currency, interval_type, interval_count, is_active, created_at, updated_at)
		VALUES (:id, :merchant_id, :name, :description, :amount, :currency, :interval_type, :interval_count, :is_active, :created_at, :updated_at)
	`
	_, err := r.db.NamedExecContext(ctx, query, plan)
	return err
}

func (r *subscriptionRepository) GetPlan(ctx context.Context, merchantID, planID uuid.UUID) (*models.SubscriptionPlan, error) {
	var plan models.SubscriptionPlan
	query := `SELECT * FROM subscription_plans WHERE id = $1 AND merchant_id = $2`
	err := r.db.GetContext(ctx, &plan, query, planID, merchantID)
	return &plan, err
}

func (r *subscriptionRepository) ListPlans(ctx context.Context, merchantID uuid.UUID) ([]*models.SubscriptionPlan, error) {
	var plans []*models.SubscriptionPlan
	query := `SELECT * FROM subscription_plans WHERE merchant_id = $1 ORDER BY created_at DESC`
	err := r.db.SelectContext(ctx, &plans, query, merchantID)
	if err == sql.ErrNoRows {
		return []*models.SubscriptionPlan{}, nil
	}
	return plans, err
}

func (r *subscriptionRepository) CreateSubscription(ctx context.Context, sub *models.Subscription) error {
	var metaJSON []byte
	if sub.Metadata != nil {
		metaJSON, _ = json.Marshal(sub.Metadata)
	}

	query := `
		INSERT INTO subscriptions 
		(id, merchant_id, plan_id, customer_email, customer_phone, status, current_period_start, current_period_end, next_billing_date, canceled_at, upi_mandate_id, card_mandate_id, metadata, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
	`
	_, err := r.db.ExecContext(ctx, query,
		sub.ID, sub.MerchantID, sub.PlanID, sub.CustomerEmail, sub.CustomerPhone, sub.Status,
		sub.CurrentPeriodStart, sub.CurrentPeriodEnd, sub.NextBillingDate, sub.CanceledAt,
		sub.UPIMandateID, sub.CardMandateID, string(metaJSON), sub.CreatedAt, sub.UpdatedAt,
	)
	return err
}

func (r *subscriptionRepository) GetSubscription(ctx context.Context, merchantID, subID uuid.UUID) (*models.Subscription, error) {
	var dbSub struct {
		models.Subscription
		MetaJSON []byte `db:"metadata"`
	}
	query := `SELECT * FROM subscriptions WHERE id = $1 AND merchant_id = $2`
	err := r.db.GetContext(ctx, &dbSub, query, subID, merchantID)
	if err != nil {
		return nil, err
	}

	sub := dbSub.Subscription
	if len(dbSub.MetaJSON) > 0 {
		_ = json.Unmarshal(dbSub.MetaJSON, &sub.Metadata)
	}
	return &sub, nil
}

func (r *subscriptionRepository) UpdateSubscription(ctx context.Context, sub *models.Subscription) error {
	var metaJSON []byte
	if sub.Metadata != nil {
		metaJSON, _ = json.Marshal(sub.Metadata)
	}

	query := `
		UPDATE subscriptions SET 
			status = $1, current_period_start = $2, current_period_end = $3, 
			next_billing_date = $4, canceled_at = $5, upi_mandate_id = $6, 
			card_mandate_id = $7, metadata = $8, updated_at = $9
		WHERE id = $10 AND merchant_id = $11
	`
	_, err := r.db.ExecContext(ctx, query,
		sub.Status, sub.CurrentPeriodStart, sub.CurrentPeriodEnd,
		sub.NextBillingDate, sub.CanceledAt, sub.UPIMandateID,
		sub.CardMandateID, string(metaJSON), sub.UpdatedAt,
		sub.ID, sub.MerchantID,
	)
	return err
}

func (r *subscriptionRepository) ListSubscriptions(ctx context.Context, merchantID uuid.UUID) ([]*models.Subscription, error) {
	var dbSubs []struct {
		models.Subscription
		MetaJSON []byte `db:"metadata"`
	}

	query := `SELECT * FROM subscriptions WHERE merchant_id = $1 ORDER BY created_at DESC`
	err := r.db.SelectContext(ctx, &dbSubs, query, merchantID)
	if err != nil && err != sql.ErrNoRows {
		return nil, err
	}

	var subs []*models.Subscription
	for _, dbSub := range dbSubs {
		sub := dbSub.Subscription
		if len(dbSub.MetaJSON) > 0 {
			_ = json.Unmarshal(dbSub.MetaJSON, &sub.Metadata)
		}
		subs = append(subs, &sub)
	}

	return subs, nil
}

func (r *subscriptionRepository) GetDueSubscriptions(ctx context.Context) ([]*models.Subscription, error) {
	var dbSubs []struct {
		models.Subscription
		MetaJSON []byte `db:"metadata"`
	}

	// Find subscriptions where next_billing_date is TODAY or EARLIER, and status is active
	query := `SELECT * FROM subscriptions WHERE status = 'active' AND next_billing_date <= NOW() ORDER BY next_billing_date ASC`
	err := r.db.SelectContext(ctx, &dbSubs, query)
	if err != nil && err != sql.ErrNoRows {
		return nil, err
	}

	var subs []*models.Subscription
	for _, dbSub := range dbSubs {
		sub := dbSub.Subscription
		if len(dbSub.MetaJSON) > 0 {
			_ = json.Unmarshal(dbSub.MetaJSON, &sub.Metadata)
		}
		subs = append(subs, &sub)
	}

	return subs, nil
}
