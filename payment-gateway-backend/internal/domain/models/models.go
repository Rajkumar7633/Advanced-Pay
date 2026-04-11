package models

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// Transaction represents a payment transaction
type Transaction struct {
	ID                uuid.UUID              `json:"id" db:"id"`
	MerchantID        uuid.UUID              `json:"merchant_id" db:"merchant_id"`
	OrderID           string                 `json:"order_id" db:"order_id"`
	Amount            decimal.Decimal        `json:"amount" db:"amount"`
	Currency          string                 `json:"currency" db:"currency"`
	BaseAmount        *decimal.Decimal       `json:"base_amount,omitempty" db:"base_amount"`
	ExchangeRate      *decimal.Decimal       `json:"exchange_rate,omitempty" db:"exchange_rate"`
	Status            string                 `json:"status" db:"status"`
	PaymentMethod     string                 `json:"payment_method" db:"payment_method"`
	PaymentProvider   string                 `json:"payment_provider" db:"payment_provider"`
	CustomerEmail     string                 `json:"customer_email" db:"customer_email"`
	CustomerPhone     string                 `json:"customer_phone" db:"customer_phone"`
	CustomerIP        string                 `json:"customer_ip" db:"customer_ip"`
	DeviceFingerprint string                 `json:"device_fingerprint" db:"device_fingerprint"`
	FraudScore        *int                   `json:"fraud_score" db:"fraud_score"`
	RoutingDecision   map[string]interface{} `json:"routing_decision" db:"routing_decision"`
	Metadata          map[string]interface{} `json:"metadata" db:"metadata"`
	SettlementID      *uuid.UUID             `json:"settlement_id" db:"settlement_id"`
	CreatedAt         time.Time              `json:"created_at" db:"created_at"`
	UpdatedAt         time.Time              `json:"updated_at" db:"updated_at"`
	CompletedAt       *time.Time             `json:"completed_at" db:"completed_at"`
}

// TransactionStatus constants
const (
	TransactionStatusInitiated  = "initiated"
	TransactionStatusProcessing = "processing"
	TransactionStatusRequiresAction = "requires_action"
	TransactionStatusSuccess    = "success"
	TransactionStatusFailed     = "failed"
	TransactionStatusRefunded   = "refunded"
)

// PaymentMethod constants
const (
	PaymentMethodCard       = "card"
	PaymentMethodUPI        = "upi"
	PaymentMethodNetBanking = "netbanking"
	PaymentMethodWallet     = "wallet"
	PaymentMethodBNPL       = "bnpl"
)

// Merchant represents a merchant account
type Merchant struct {
	ID                uuid.UUID        `json:"id" db:"id"`
	BusinessName      string           `json:"business_name" db:"business_name"`
	Email             string           `json:"email" db:"email"`
	Phone             string           `json:"phone" db:"phone"`
	Description       *string          `json:"description" db:"description"`
	Website           *string          `json:"website" db:"website"`
	Industry          *string          `json:"industry" db:"industry"`
	TaxID             *string          `json:"tax_id" db:"tax_id"`
	GSTNumber         *string          `json:"gst_number" db:"gst_number"`
	AddressStreet     *string          `json:"address_street" db:"address_street"`
	AddressCity       *string          `json:"address_city" db:"address_city"`
	AddressState      *string          `json:"address_state" db:"address_state"`
	AddressCountry    *string          `json:"address_country" db:"address_country"`
	AddressPostalCode *string          `json:"address_postal_code" db:"address_postal_code"`
	PasswordHash      string           `json:"-" db:"password_hash"`
	APIKeyHash        string           `json:"-" db:"api_key_hash"`
	APISecretHash     string           `json:"-" db:"api_secret_hash"`
	Status            string           `json:"status" db:"status"`
	KYCStatus         string           `json:"kyc_status" db:"kyc_status"`
	TwoFactorEnabled  bool             `json:"two_factor_enabled" db:"two_factor_enabled"`
	TwoFactorSecret   *string          `json:"-" db:"two_factor_secret"`
	TokenVersion      int              `json:"-" db:"token_version"`
	Settings          MerchantSettings `json:"settings" db:"settings"`
	CreatedAt         time.Time        `json:"created_at" db:"created_at"`
	UpdatedAt         time.Time        `json:"updated_at" db:"updated_at"`
}

// MerchantSettings holds merchant-specific settings
type MerchantSettings struct {
	SettlementCycle   string                 `json:"settlement_cycle"`
	AutoRefundEnabled bool                   `json:"auto_refund_enabled"`
	WebhookURL        string                 `json:"webhook_url"`
	WebhookSecret     string                 `json:"webhook_secret"`
	PaymentMethods    []string               `json:"payment_methods"`
	FraudThreshold    int                    `json:"fraud_threshold"`
	Preferences       map[string]interface{} `json:"preferences"`
}

// Value implements the driver.Valuer interface for MerchantSettings
func (s MerchantSettings) Value() (driver.Value, error) {
	return json.Marshal(s)
}

// Scan implements the sql.Scanner interface for MerchantSettings
func (s *MerchantSettings) Scan(value interface{}) error {
	if value == nil {
		return nil
	}
	b, ok := value.([]byte)
	if !ok {
		return fmt.Errorf("type assertion to []byte failed")
	}
	return json.Unmarshal(b, &s)
}

// Payment represents payment details
type Payment struct {
	TransactionID uuid.UUID `json:"transaction_id" db:"transaction_id"`
	Token         string    `json:"token" db:"token"`
	CardLast4     string    `json:"card_last4" db:"card_last4"`
	CardBrand     string    `json:"card_brand" db:"card_brand"`
	CardType      string    `json:"card_type" db:"card_type"`
	UPIVPA        string    `json:"upi_vpa" db:"upi_vpa"`
	BankCode      string    `json:"bank_code" db:"bank_code"`
	EncryptedData string    `json:"-" db:"encrypted_data"`
	CreatedAt     time.Time `json:"created_at" db:"created_at"`
}

// Refund represents a refund transaction
type Refund struct {
	ID            uuid.UUID       `json:"id" db:"id"`
	TransactionID uuid.UUID       `json:"transaction_id" db:"transaction_id"`
	Amount        decimal.Decimal `json:"amount" db:"amount"`
	Reason        string          `json:"reason" db:"reason"`
	Status        string          `json:"status" db:"status"`
	ProcessedAt   *time.Time      `json:"processed_at" db:"processed_at"`
	CreatedAt     time.Time       `json:"created_at" db:"created_at"`
}

// Webhook represents a webhook configuration
type Webhook struct {
	ID         uuid.UUID `json:"id" db:"id"`
	MerchantID uuid.UUID `json:"merchant_id" db:"merchant_id"`
	URL        string    `json:"url" db:"url"`
	Secret     string    `json:"-" db:"secret"`
	Events     []string  `json:"events" db:"events"`
	IsActive   bool      `json:"is_active" db:"is_active"`
	CreatedAt  time.Time `json:"created_at" db:"created_at"`
	UpdatedAt  time.Time `json:"updated_at" db:"updated_at"`
}

// WebhookEvent represents a webhook event to be sent
type WebhookEvent struct {
	ID            uuid.UUID              `json:"id" db:"id"`
	MerchantID    uuid.UUID              `json:"merchant_id" db:"merchant_id"`
	EventType     string                 `json:"event_type" db:"event_type"`
	TransactionID *uuid.UUID             `json:"transaction_id" db:"transaction_id"`
	Payload       map[string]interface{} `json:"payload" db:"payload"`
	Status        string                 `json:"status" db:"status"`
	Attempts      int                    `json:"attempts" db:"attempts"`
	LastAttempt   *time.Time             `json:"last_attempt" db:"last_attempt"`
	NextRetry     *time.Time             `json:"next_retry" db:"next_retry"`
	CreatedAt     time.Time              `json:"created_at" db:"created_at"`
}

// FraudEvent represents a fraud detection event
type FraudEvent struct {
	ID             uuid.UUID              `json:"id" db:"id"`
	TransactionID  uuid.UUID              `json:"transaction_id" db:"transaction_id"`
	FraudScore     int                    `json:"fraud_score" db:"fraud_score"`
	RiskFactors    map[string]interface{} `json:"risk_factors" db:"risk_factors"`
	ActionTaken    string                 `json:"action_taken" db:"action_taken"`
	MLModelVersion string                 `json:"ml_model_version" db:"ml_model_version"`
	CreatedAt      time.Time              `json:"created_at" db:"created_at"`
}

// Settlement represents a settlement batch
type Settlement struct {
	ID                uuid.UUID       `json:"id" db:"id"`
	MerchantID        uuid.UUID       `json:"merchant_id" db:"merchant_id"`
	SettlementDate    time.Time       `json:"settlement_date" db:"settlement_date"`
	TotalAmount       decimal.Decimal `json:"total_amount" db:"total_amount"`
	TotalTransactions int             `json:"total_transactions" db:"total_transactions"`
	Fees              decimal.Decimal `json:"fees" db:"fees"`
	Tax               decimal.Decimal `json:"tax" db:"tax"`
	NetAmount         decimal.Decimal `json:"net_amount" db:"net_amount"`
	Status            string          `json:"status" db:"status"`
	UTRNumber         string          `json:"utr_number" db:"utr_number"`
	SettledAt         *time.Time      `json:"settled_at" db:"settled_at"`
	CreatedAt         time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt         time.Time       `json:"updated_at" db:"updated_at"`
}

// CreatePaymentRequest represents a payment creation request
type CreatePaymentRequest struct {
	OrderID       string                 `json:"order_id" binding:"required"`
	Amount        float64                `json:"amount" binding:"required,gt=0"`
	Currency      string                 `json:"currency" binding:"required,len=3"`
	PaymentMethod string                 `json:"payment_method" binding:"required"`
	CardToken     string                 `json:"card_token,omitempty"`
	CustomerEmail string                 `json:"customer_email" binding:"required,email"`
	CustomerPhone string                 `json:"customer_phone" binding:"required"`
	Metadata      map[string]interface{} `json:"metadata"`
}

// CreatePaymentResponse represents payment creation response
type CreatePaymentResponse struct {
	TransactionID string    `json:"transaction_id"`
	OrderID       string    `json:"order_id"`
	Amount        float64   `json:"amount"`
	Currency      string    `json:"currency"`
	Status        string    `json:"status"`
	PaymentURL    string    `json:"payment_url,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
}

// LoginRequest represents login credentials
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
}

// LoginResponse represents login response with tokens
type LoginResponse struct {
	AccessToken  string `json:"access_token,omitempty"`
	RefreshToken string `json:"refresh_token,omitempty"`
	ExpiresIn    int64  `json:"expires_in,omitempty"`
	TokenType    string `json:"token_type,omitempty"`
	Requires2FA  bool   `json:"requires_2fa,omitempty"`
	MerchantID   string `json:"merchant_id,omitempty"`
}

// Verify2FARequest represents a 2FA code verification attempt
type Verify2FARequest struct {
	MerchantID string `json:"merchant_id" binding:"required"`
	Code       string `json:"code" binding:"required"`
}

// RegisterRequest represents merchant registration
type RegisterRequest struct {
	BusinessName string `json:"business_name" binding:"required"`
	Email        string `json:"email" binding:"required,email"`
	Phone        string `json:"phone" binding:"required"`
	Password     string `json:"password" binding:"required,min=8"`
}

// TeamMember represents a team member attached to a merchant account
type TeamMember struct {
	ID         uuid.UUID `json:"id" db:"id"`
	MerchantID uuid.UUID `json:"merchant_id" db:"merchant_id"`
	Name       string    `json:"name" db:"name"`
	Email      string    `json:"email" db:"email"`
	Role       string    `json:"role" db:"role"`
	Status     string    `json:"status" db:"status"`
	CreatedAt  time.Time `json:"created_at" db:"created_at"`
	UpdatedAt  time.Time `json:"updated_at" db:"updated_at"`
}
