package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/yourcompany/payment-gateway/internal/domain/models"
)

// TransactionRepository defines transaction data access methods
type TransactionRepository interface {
	Create(ctx context.Context, tx *models.Transaction) error
	GetByID(ctx context.Context, id uuid.UUID) (*models.Transaction, error)
	GetByOrderID(ctx context.Context, merchantID uuid.UUID, orderID string) (*models.Transaction, error)
	List(ctx context.Context, merchantID uuid.UUID, filters TransactionFilters) ([]*models.Transaction, int64, error)
	Update(ctx context.Context, tx *models.Transaction) error
	UpdateStatus(ctx context.Context, id uuid.UUID, status string) error
	GetCustomersByMerchant(ctx context.Context, merchantID uuid.UUID) ([]*models.Transaction, error)
	GetUnsettled(ctx context.Context) ([]*models.Transaction, error)
	MarkAsSettled(ctx context.Context, txIDs []uuid.UUID, settlementID uuid.UUID) error
	GetHighRiskTransactions(ctx context.Context, threshold int) ([]*models.Transaction, error)
}

// TransactionFilters for filtering transactions
type TransactionFilters struct {
	Status        string
	PaymentMethod string
	StartDate     time.Time
	EndDate       time.Time
	Limit         int
	Offset        int
}

// APIKey model for repository
type APIKey struct {
	ID             string     `db:"id" json:"id"`
	MerchantID     string     `db:"merchant_id" json:"merchant_id"`
	Environment    string     `db:"environment" json:"environment"`
	PublishableKey string     `db:"publishable_key" json:"publishable_key"`
	SecretKeyID    string     `db:"secret_key_id" json:"secret_key_id"`
	SecretKeyHash  string     `db:"secret_key_hash" json:"-"`
	CreatedAt      string     `db:"created_at" json:"created_at"`
	IsActive       bool       `db:"is_active" json:"is_active"`
}

// MerchantRepository defines merchant data access methods
type MerchantRepository interface {
	Create(ctx context.Context, merchant *models.Merchant) error
	GetByID(ctx context.Context, id uuid.UUID) (*models.Merchant, error)
	GetByEmail(ctx context.Context, email string) (*models.Merchant, error)
	GetByAPIKey(ctx context.Context, apiKey string) (*models.Merchant, error)
	Update(ctx context.Context, merchant *models.Merchant) error
	UpdateStatus(ctx context.Context, id uuid.UUID, status string) error
	
	CreateAPIKey(ctx context.Context, key *APIKey) error
	GetAPIKeys(ctx context.Context, merchantID uuid.UUID) ([]APIKey, error)
	GetMerchantBySecretKey(ctx context.Context, secretHash string) (*models.Merchant, string, error)
}

// PaymentRepository defines payment data access methods
type PaymentRepository interface {
	Create(ctx context.Context, payment *models.Payment) error
	GetByTransactionID(ctx context.Context, txID uuid.UUID) (*models.Payment, error)
	Update(ctx context.Context, payment *models.Payment) error
}

// RefundRepository defines refund data access methods
type RefundRepository interface {
	Create(ctx context.Context, refund *models.Refund) error
	GetByID(ctx context.Context, id uuid.UUID) (*models.Refund, error)
	GetByTransactionID(ctx context.Context, txID uuid.UUID) ([]*models.Refund, error)
	Update(ctx context.Context, refund *models.Refund) error
}

// WebhookRepository defines webhook data access methods
type WebhookRepository interface {
	Create(ctx context.Context, webhook *models.Webhook) error
	GetByID(ctx context.Context, id uuid.UUID) (*models.Webhook, error)
	List(ctx context.Context, merchantID uuid.UUID) ([]*models.Webhook, error)
	Delete(ctx context.Context, id uuid.UUID) error
	CreateEvent(ctx context.Context, event *models.WebhookEvent) error
	GetPendingEvents(ctx context.Context, limit int) ([]*models.WebhookEvent, error)
	UpdateEventStatus(ctx context.Context, eventID uuid.UUID, status string, attempts int, nextRetry *time.Time) error
}

// FraudRepository defines fraud detection data access methods
type FraudRepository interface {
	Create(ctx context.Context, event *models.FraudEvent) error
	GetByTransactionID(ctx context.Context, txID uuid.UUID) (*models.FraudEvent, error)
	ListHighRisk(ctx context.Context, threshold int, limit int) ([]*models.FraudEvent, error)
}

// SettlementRepository defines settlement data access methods
type SettlementRepository interface {
	Create(ctx context.Context, settlement *models.Settlement) error
	GetByID(ctx context.Context, id uuid.UUID) (*models.Settlement, error)
	List(ctx context.Context, merchantID uuid.UUID) ([]*models.Settlement, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status string, utrNumber string) error
}

// TeamRepository defines team data access methods
type TeamRepository interface {
	Create(ctx context.Context, member *models.TeamMember) error
	GetByMerchantID(ctx context.Context, merchantID uuid.UUID) ([]*models.TeamMember, error)
	Delete(ctx context.Context, id uuid.UUID, merchantID uuid.UUID) error
}
