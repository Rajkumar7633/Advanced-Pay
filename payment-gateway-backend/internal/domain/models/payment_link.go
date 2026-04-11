package models

import (
	"time"
	"github.com/google/uuid"
)

type PaymentLink struct {
	ID              uuid.UUID  `json:"id" db:"id"`
	MerchantID      uuid.UUID  `json:"merchant_id" db:"merchant_id"`
	Amount          float64    `json:"amount" db:"amount"`
	Currency        string     `json:"currency" db:"currency"`
	Description     *string    `json:"description" db:"description"`
	Status          string     `json:"status" db:"status"`
	Link            string     `json:"link" db:"link"`
	Clicks          int        `json:"clicks" db:"clicks"`
	Payments        int        `json:"payments" db:"payments"`
	Revenue         float64    `json:"revenue" db:"revenue"`
	ConversionRate  float64    `json:"conversion_rate" db:"conversion_rate"`
	CreatedAt       time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at" db:"updated_at"`
}

func NewPaymentLink(merchantID uuid.UUID, amount float64, currency, description, link string) *PaymentLink {
	now := time.Now()
	return &PaymentLink{
		ID:              uuid.New(),
		MerchantID:      merchantID,
		Amount:          amount,
		Currency:        currency,
		Description:     &description,
		Status:          "active",
		Link:            link,
		Clicks:          0,
		Payments:        0,
		Revenue:         0.0,
		ConversionRate:  0.0,
		CreatedAt:       now,
		UpdatedAt:       now,
	}
}
