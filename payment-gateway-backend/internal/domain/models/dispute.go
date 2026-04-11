package models

import (
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// Dispute represents a chargeback or payment dispute
type Dispute struct {
	ID            uuid.UUID       `json:"id" db:"id"`
	MerchantID    uuid.UUID       `json:"merchant_id" db:"merchant_id"`
	TransactionID uuid.UUID       `json:"transaction_id" db:"transaction_id"`
	Amount        decimal.Decimal `json:"amount" db:"amount"`
	Currency      string          `json:"currency" db:"currency"`
	Reason        string          `json:"reason" db:"reason"`
	Status        string          `json:"status" db:"status"`
	Description   *string         `json:"description" db:"description"`
	Evidence      *string         `json:"evidence" db:"evidence"`
	EvidenceURL   *string         `json:"evidence_url" db:"evidence_url"`
	DueBy         *time.Time      `json:"due_by" db:"due_by"`
	ResolvedAt    *time.Time      `json:"resolved_at" db:"resolved_at"`
	CreatedAt     time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time       `json:"updated_at" db:"updated_at"`
}

// DisputeStatus constants
const (
	DisputeStatusOpen        = "open"
	DisputeStatusUnderReview = "under_review"
	DisputeStatusWon         = "won"
	DisputeStatusLost        = "lost"
	DisputeStatusClosed      = "closed"
)

// DisputeReason constants
const (
	DisputeReasonFraudulent         = "fraudulent"
	DisputeReasonProductNotReceived = "product_not_received"
	DisputeReasonDuplicate          = "duplicate"
	DisputeReasonSubscriptionCanceled = "subscription_canceled"
	DisputeReasonGeneral            = "general"
)
