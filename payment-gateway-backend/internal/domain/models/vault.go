package models

import (
	"time"

	"github.com/google/uuid"
)

// CardVault represents a securely tokenized card
type CardVault struct {
	ID               uuid.UUID `json:"id" db:"id"`
	MerchantID       uuid.UUID `json:"merchant_id" db:"merchant_id"`
	CustomerEmail    string    `json:"customer_email" db:"customer_email"`
	TokenID          string    `json:"token_id" db:"token_id"`
	CardLast4        string    `json:"card_last4" db:"card_last4"`
	CardBrand        string    `json:"card_brand" db:"card_brand"`
	ExpiryMonth      string    `json:"expiry_month" db:"expiry_month"`
	ExpiryYear       string    `json:"expiry_year" db:"expiry_year"`
	EncryptedPayload string    `json:"-" db:"encrypted_payload"` 
	CreatedAt        time.Time `json:"created_at" db:"created_at"`
	UpdatedAt        time.Time `json:"updated_at" db:"updated_at"`
}

// VaultTokenRequest represents an incoming card vaulting payload
type VaultTokenRequest struct {
	CardNumber    string `json:"card_number" binding:"required,min=13,max=19"`
	ExpiryMonth   string `json:"expiry_month" binding:"required,len=2"`
	ExpiryYear    string `json:"expiry_year" binding:"required,len=4"`
	CVV           string `json:"cvv" binding:"required,min=3,max=4"` // Strictly dropped, never vaulted
	CustomerEmail string `json:"customer_email" binding:"required,email"`
}

// VaultTokenResponse returns the safe surrogate 
type VaultTokenResponse struct {
	TokenID   string `json:"token_id"`
	CardLast4 string `json:"card_last4"`
	CardBrand string `json:"card_brand"`
}
