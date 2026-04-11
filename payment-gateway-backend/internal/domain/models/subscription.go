package models

import (
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// SubscriptionPlanStatus enum
type SubscriptionPlanStatus string

const (
	PlanStatusActive   SubscriptionPlanStatus = "active"
	PlanStatusInactive SubscriptionPlanStatus = "inactive"
)

// SubscriptionPlan models the recurring billing template
type SubscriptionPlan struct {
	ID            uuid.UUID              `json:"id" db:"id"`
	MerchantID    uuid.UUID              `json:"merchant_id" db:"merchant_id"`
	Name          string                 `json:"name" db:"name"`
	Description   string                 `json:"description" db:"description"`
	Amount        decimal.Decimal        `json:"amount" db:"amount"`
	Currency      string                 `json:"currency" db:"currency"`
	IntervalType  string                 `json:"interval_type" db:"interval_type"` // daily, weekly, monthly, yearly
	IntervalCount int                    `json:"interval_count" db:"interval_count"`
	IsActive      bool                   `json:"is_active" db:"is_active"`
	CreatedAt     time.Time              `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time              `json:"updated_at" db:"updated_at"`
}

// SubscriptionStatus enum
type SubscriptionStatus string

const (
	SubscriptionStatusIncomplete SubscriptionStatus = "incomplete"
	SubscriptionStatusActive     SubscriptionStatus = "active"
	SubscriptionStatusPastDue    SubscriptionStatus = "past_due"
	SubscriptionStatusCanceled   SubscriptionStatus = "canceled"
)

// Subscription models the customer's active recurring cycle
type Subscription struct {
	ID                 uuid.UUID          `json:"id" db:"id"`
	MerchantID         uuid.UUID          `json:"merchant_id" db:"merchant_id"`
	PlanID             uuid.UUID          `json:"plan_id" db:"plan_id"`
	CustomerEmail      string             `json:"customer_email" db:"customer_email"`
	CustomerPhone      string             `json:"customer_phone" db:"customer_phone"`
	Status             SubscriptionStatus `json:"status" db:"status"`
	CurrentPeriodStart time.Time          `json:"current_period_start" db:"current_period_start"`
	CurrentPeriodEnd   time.Time          `json:"current_period_end" db:"current_period_end"`
	NextBillingDate    *time.Time         `json:"next_billing_date" db:"next_billing_date"`
	CanceledAt         *time.Time         `json:"canceled_at" db:"canceled_at"`
	UPIMandateID       *string            `json:"upi_mandate_id" db:"upi_mandate_id"`
	CardMandateID      *string            `json:"card_mandate_id" db:"card_mandate_id"`
	Metadata           map[string]interface{} `json:"metadata"`
	CreatedAt          time.Time          `json:"created_at" db:"created_at"`
	UpdatedAt          time.Time          `json:"updated_at" db:"updated_at"`
}

// CreateSubscriptionOptions are parameters for starting a new subscription
type CreateSubscriptionOptions struct {
	CustomerEmail string
	CustomerPhone string
	Metadata      map[string]interface{}
}
