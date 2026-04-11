package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/yourcompany/payment-gateway/internal/domain/models"
)

// VaultRepository handles data access for PCI vaulted tokens
type VaultRepository interface {
	Create(ctx context.Context, vault *models.CardVault) error
	GetByToken(ctx context.Context, tokenID string) (*models.CardVault, error)
	GetByCustomer(ctx context.Context, merchantID uuid.UUID, email string) ([]*models.CardVault, error)
}

type vaultRepository struct {
	db *sqlx.DB
}

// NewVaultRepository initializes the token DB
func NewVaultRepository(db *sqlx.DB) VaultRepository {
	return &vaultRepository{db: db}
}

func (r *vaultRepository) Create(ctx context.Context, vault *models.CardVault) error {
	query := `
		INSERT INTO card_vault (
			id, merchant_id, customer_email, token_id, card_last4,
			card_brand, expiry_month, expiry_year, encrypted_payload,
			created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
		)`

	_, err := r.db.ExecContext(ctx, query,
		vault.ID, vault.MerchantID, vault.CustomerEmail, vault.TokenID,
		vault.CardLast4, vault.CardBrand, vault.ExpiryMonth, vault.ExpiryYear,
		vault.EncryptedPayload, vault.CreatedAt, vault.UpdatedAt,
	)
	return err
}

func (r *vaultRepository) GetByToken(ctx context.Context, tokenID string) (*models.CardVault, error) {
	query := `SELECT id, merchant_id, customer_email, token_id, card_last4, card_brand, expiry_month, expiry_year, encrypted_payload, created_at, updated_at FROM card_vault WHERE token_id = $1`
	var vault models.CardVault
	err := r.db.QueryRowContext(ctx, query, tokenID).Scan(
		&vault.ID, &vault.MerchantID, &vault.CustomerEmail, &vault.TokenID,
		&vault.CardLast4, &vault.CardBrand, &vault.ExpiryMonth, &vault.ExpiryYear,
		&vault.EncryptedPayload, &vault.CreatedAt, &vault.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &vault, nil
}

func (r *vaultRepository) GetByCustomer(ctx context.Context, merchantID uuid.UUID, email string) ([]*models.CardVault, error) {
	query := `SELECT id, merchant_id, customer_email, token_id, card_last4, card_brand, expiry_month, expiry_year, encrypted_payload, created_at, updated_at FROM card_vault WHERE merchant_id = $1 AND customer_email = $2 ORDER BY created_at DESC`
	
	rows, err := r.db.QueryContext(ctx, query, merchantID, email)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var vaults []*models.CardVault
	for rows.Next() {
		var vault models.CardVault
		err := rows.Scan(
			&vault.ID, &vault.MerchantID, &vault.CustomerEmail, &vault.TokenID,
			&vault.CardLast4, &vault.CardBrand, &vault.ExpiryMonth, &vault.ExpiryYear,
			&vault.EncryptedPayload, &vault.CreatedAt, &vault.UpdatedAt,
		)
		if err == nil {
			vaults = append(vaults, &vault)
		}
	}
	return vaults, nil
}
