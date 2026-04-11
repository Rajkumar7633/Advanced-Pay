package repository

import (
	"context"
	"database/sql"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/yourcompany/payment-gateway/internal/domain/models"
)

type PaymentLinkRepository interface {
	Create(ctx context.Context, link *models.PaymentLink) error
	GetByID(ctx context.Context, id uuid.UUID) (*models.PaymentLink, error)
	GetByMerchantID(ctx context.Context, merchantID uuid.UUID) ([]*models.PaymentLink, error)
	Update(ctx context.Context, link *models.PaymentLink) error
	Delete(ctx context.Context, id uuid.UUID) error
}

type paymentLinkRepository struct {
	db *sqlx.DB
}

func NewPaymentLinkRepository(db *sqlx.DB) PaymentLinkRepository {
	return &paymentLinkRepository{db: db}
}

func (r *paymentLinkRepository) Create(ctx context.Context, link *models.PaymentLink) error {
	query := `
		INSERT INTO payment_links (id, merchant_id, amount, currency, description, status, link, clicks, payments, revenue, conversion_rate, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
	`

	_, err := r.db.ExecContext(ctx, query,
		link.ID, link.MerchantID, link.Amount, link.Currency, link.Description,
		link.Status, link.Link, link.Clicks, link.Payments, link.Revenue,
		link.ConversionRate, link.CreatedAt, link.UpdatedAt,
	)

	return err
}

func (r *paymentLinkRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.PaymentLink, error) {
	query := `
		SELECT id, merchant_id, amount, currency, description, status, link, clicks, payments, revenue, conversion_rate, created_at, updated_at
		FROM payment_links
		WHERE id = $1
	`

	var link models.PaymentLink
	var description sql.NullString

	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&link.ID, &link.MerchantID, &link.Amount, &link.Currency, &description,
		&link.Status, &link.Link, &link.Clicks, &link.Payments, &link.Revenue,
		&link.ConversionRate, &link.CreatedAt, &link.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	if description.Valid {
		link.Description = &description.String
	}

	return &link, nil
}

func (r *paymentLinkRepository) GetByMerchantID(ctx context.Context, merchantID uuid.UUID) ([]*models.PaymentLink, error) {
	query := `
		SELECT id, merchant_id, amount, currency, description, status, link, clicks, payments, revenue, conversion_rate, created_at, updated_at
		FROM payment_links
		WHERE merchant_id = $1
		ORDER BY created_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query, merchantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var links []*models.PaymentLink

	for rows.Next() {
		var link models.PaymentLink
		var description sql.NullString

		err := rows.Scan(
			&link.ID, &link.MerchantID, &link.Amount, &link.Currency, &description,
			&link.Status, &link.Link, &link.Clicks, &link.Payments, &link.Revenue,
			&link.ConversionRate, &link.CreatedAt, &link.UpdatedAt,
		)

		if err != nil {
			return nil, err
		}

		if description.Valid {
			link.Description = &description.String
		}

		links = append(links, &link)
	}

	return links, rows.Err()
}

func (r *paymentLinkRepository) Update(ctx context.Context, link *models.PaymentLink) error {
	query := `
		UPDATE payment_links
		SET amount = $2, currency = $3, description = $4, status = $5, link = $6, 
			clicks = $7, payments = $8, revenue = $9, conversion_rate = $10, updated_at = $11
		WHERE id = $1
	`

	link.UpdatedAt = time.Now()

	_, err := r.db.ExecContext(ctx, query,
		link.ID, link.Amount, link.Currency, link.Description, link.Status,
		link.Link, link.Clicks, link.Payments, link.Revenue,
		link.ConversionRate, link.UpdatedAt,
	)

	return err
}

func (r *paymentLinkRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM payment_links WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}
