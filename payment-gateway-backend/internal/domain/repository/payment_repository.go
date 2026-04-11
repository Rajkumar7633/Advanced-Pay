package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/yourcompany/payment-gateway/internal/domain/models"
)

type paymentRepository struct {
	db *sqlx.DB
}

func NewPaymentRepository(db *sqlx.DB) PaymentRepository {
	return &paymentRepository{db: db}
}

func (r *paymentRepository) Create(ctx context.Context, payment *models.Payment) error {
	query := `
		INSERT INTO payment_details (
			transaction_id, token, card_last4, card_brand, card_type,
			upi_vpa, bank_code, encrypted_data, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`

	_, err := r.db.ExecContext(ctx, query,
		payment.TransactionID, payment.Token, payment.CardLast4,
		payment.CardBrand, payment.CardType, payment.UPIVPA,
		payment.BankCode, payment.EncryptedData, payment.CreatedAt,
	)

	return err
}

func (r *paymentRepository) GetByTransactionID(ctx context.Context, txID uuid.UUID) (*models.Payment, error) {
	query := `
		SELECT transaction_id, token, card_last4, card_brand, card_type,
		       upi_vpa, bank_code, encrypted_data, created_at
		FROM payment_details
		WHERE transaction_id = $1`

	var payment models.Payment
	err := r.db.GetContext(ctx, &payment, query, txID)
	if err != nil {
		return nil, err
	}

	return &payment, nil
}

func (r *paymentRepository) Update(ctx context.Context, payment *models.Payment) error {
	query := `
		UPDATE payment_details
		SET token = $1, card_last4 = $2, card_brand = $3,
		    card_type = $4, encrypted_data = $5
		WHERE transaction_id = $6`

	_, err := r.db.ExecContext(ctx, query,
		payment.Token, payment.CardLast4, payment.CardBrand,
		payment.CardType, payment.EncryptedData, payment.TransactionID,
	)

	return err
}
