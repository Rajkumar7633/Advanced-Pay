package repository

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/yourcompany/payment-gateway/internal/domain/models"
	"github.com/yourcompany/payment-gateway/pkg/crypto"
)

type merchantRepository struct {
	db *sqlx.DB
}

func NewMerchantRepository(db *sqlx.DB) MerchantRepository {
	return &merchantRepository{db: db}
}

func (r *merchantRepository) CreateAPIKey(ctx context.Context, key *APIKey) error {
	query := `
		INSERT INTO api_keys (merchant_id, environment, publishable_key, secret_key_id, secret_key_hash)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (merchant_id, environment) DO UPDATE 
		SET publishable_key = EXCLUDED.publishable_key,
			secret_key_id = EXCLUDED.secret_key_id,
			secret_key_hash = EXCLUDED.secret_key_hash,
			updated_at = NOW()
	`
	_, err := r.db.ExecContext(ctx, query, key.MerchantID, key.Environment, key.PublishableKey, key.SecretKeyID, key.SecretKeyHash)
	return err
}

func (r *merchantRepository) GetAPIKeys(ctx context.Context, merchantID uuid.UUID) ([]APIKey, error) {
	var keys []APIKey
	query := `SELECT id, merchant_id, environment, publishable_key, is_active, created_at::text as created_at FROM api_keys WHERE merchant_id = $1 AND is_active = true`
	err := r.db.SelectContext(ctx, &keys, query, merchantID)
	if err != nil && err != sql.ErrNoRows {
		return nil, err
	}
	return keys, nil
}

func (r *merchantRepository) DeleteAPIKey(ctx context.Context, keyID string) error {
	query := `UPDATE api_keys SET is_active = false, updated_at = NOW() WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, keyID)
	return err
}

func (r *merchantRepository) GetMerchantBySecretKey(ctx context.Context, rawSecret string) (*models.Merchant, string, error) {
	// 1. Extract prefix/ID hint (e.g. ap_test_sec_ABCDEF...)
	// In our format ap_test_sec_{32chars_random}, let's use the first 8 random chars as ID
	if len(rawSecret) < 20 {
		return nil, "", fmt.Errorf("invalid secret key format")
	}
	
	// We'll search by the exact rawSecret as a lookup hint if we store a portion of it,
	// but since we added 'secret_key_id', we'll use that.
	// Let's assume the first 12 characters of the secret are stored in secret_key_id.
	keyID := rawSecret[0:16] // e.g. "ap_test_sec_ABCD"

	var key APIKey
	err := r.db.GetContext(ctx, &key, `SELECT merchant_id, environment, secret_key_hash FROM api_keys WHERE secret_key_id = $1 AND is_active = true`, keyID)
	if err != nil {
		return nil, "", fmt.Errorf("invalid or inactive api key")
	}

	// 2. Bcrypt verify
	if !crypto.VerifyPassword(rawSecret, key.SecretKeyHash) {
		return nil, "", fmt.Errorf("invalid secret key")
	}

	merch, err := r.GetByID(ctx, uuid.MustParse(key.MerchantID))
	return merch, key.Environment, err
}

func (r *merchantRepository) Create(ctx context.Context, merchant *models.Merchant) error {
	query := `
		INSERT INTO merchants (
			id, business_name, email, phone, password_hash, api_key_hash,
			api_secret_hash, status, kyc_status, kyc_documents, created_at, updated_at,
			website, industry, tax_id, gst_number, address_street,
			address_city, address_state, address_country, address_postal_code, settings,
			two_factor_enabled, two_factor_secret, token_version
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)`

	_, err := r.db.ExecContext(ctx, query,
		merchant.ID, merchant.BusinessName, merchant.Email, merchant.Phone,
		merchant.PasswordHash, merchant.APIKeyHash, merchant.APISecretHash,
		merchant.Status, merchant.KYCStatus, merchant.KYCDocuments, merchant.CreatedAt, merchant.UpdatedAt,
		merchant.Website, merchant.Industry, merchant.TaxID, merchant.GSTNumber,
		merchant.AddressStreet, merchant.AddressCity, merchant.AddressState,
		merchant.AddressCountry, merchant.AddressPostalCode, merchant.Settings,
		merchant.TwoFactorEnabled, merchant.TwoFactorSecret, merchant.TokenVersion,
	)

	return err
}

func (r *merchantRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Merchant, error) {
	query := `
		SELECT id, business_name, email, phone, description, password_hash, api_key_hash,
		       api_secret_hash, status, kyc_status, kyc_documents, created_at, updated_at,
		       website, industry, tax_id, gst_number, address_street,
		       address_city, address_state, address_country, address_postal_code, settings,
		       two_factor_enabled, two_factor_secret, token_version
		FROM merchants
		WHERE id = $1`

	var merchant models.Merchant
	err := r.db.GetContext(ctx, &merchant, query, id)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("merchant not found")
		}
		return nil, err
	}

	return &merchant, nil
}

func (r *merchantRepository) GetByEmail(ctx context.Context, email string) (*models.Merchant, error) {
	query := `
		SELECT id, business_name, email, phone, description, password_hash, api_key_hash,
		       api_secret_hash, status, kyc_status, kyc_documents, created_at, updated_at,
		       website, industry, tax_id, gst_number, address_street,
		       address_city, address_state, address_country, address_postal_code, settings,
		       two_factor_enabled, two_factor_secret, token_version
		FROM merchants
		WHERE email = $1`

	var merchant models.Merchant
	err := r.db.GetContext(ctx, &merchant, query, email)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("merchant not found")
		}
		return nil, err
	}

	return &merchant, nil
}

func (r *merchantRepository) GetByAPIKey(ctx context.Context, apiKeyHash string) (*models.Merchant, error) {
	query := `
		SELECT id, business_name, email, phone, description, password_hash, api_key_hash,
		       api_secret_hash, status, kyc_status, kyc_documents, created_at, updated_at,
		       website, industry, tax_id, gst_number, address_street,
		       address_city, address_state, address_country, address_postal_code, settings,
		       two_factor_enabled, two_factor_secret, token_version
		FROM merchants
		WHERE api_key_hash = $1`

	var merchant models.Merchant
	err := r.db.GetContext(ctx, &merchant, query, apiKeyHash)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("merchant not found")
		}
		return nil, err
	}

	return &merchant, nil
}

func (r *merchantRepository) Update(ctx context.Context, merchant *models.Merchant) error {
	query := `
		UPDATE merchants
		SET business_name = $1, phone = $2, status = $3,
		    kyc_status = $4, updated_at = $5, description = $6,
		    website = $7, industry = $8, tax_id = $9, gst_number = $10,
		    address_street = $11, address_city = $12, address_state = $13,
		    address_country = $14, address_postal_code = $15, settings = $16,
		    password_hash = $17, two_factor_enabled = $18, two_factor_secret = $19, token_version = $20, kyc_documents = $21
		WHERE id = $22`

	_, err := r.db.ExecContext(ctx, query,
		merchant.BusinessName, merchant.Phone, merchant.Status,
		merchant.KYCStatus, merchant.UpdatedAt, merchant.Description,
		merchant.Website, merchant.Industry, merchant.TaxID, merchant.GSTNumber,
		merchant.AddressStreet, merchant.AddressCity, merchant.AddressState,
		merchant.AddressCountry, merchant.AddressPostalCode, merchant.Settings,
		merchant.PasswordHash, merchant.TwoFactorEnabled, merchant.TwoFactorSecret, merchant.TokenVersion, merchant.KYCDocuments,
		merchant.ID,
	)

	return err
}

func (r *merchantRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status string) error {
	query := `UPDATE merchants SET status = $1, updated_at = NOW() WHERE id = $2`
	_, err := r.db.ExecContext(ctx, query, status, id)
	return err
}

func (r *merchantRepository) GetPlatformBillingProfile(ctx context.Context, merchantID uuid.UUID) (*models.PlatformBillingProfile, error) {
	var profile models.PlatformBillingProfile
	query := `SELECT * FROM merchant_billing_profiles WHERE merchant_id = $1`
	err := r.db.GetContext(ctx, &profile, query, merchantID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil // Return nil profile if not found, allowing service to default/create it
		}
		return nil, err
	}
	return &profile, nil
}

func (r *merchantRepository) CreatePlatformBillingProfile(ctx context.Context, profile *models.PlatformBillingProfile) error {
	query := `
		INSERT INTO merchant_billing_profiles (merchant_id, plan_name, fee_percentage, fixed_fee, next_billing_date, platform_card_brand, platform_card_last4)
		VALUES (:merchant_id, :plan_name, :fee_percentage, :fixed_fee, :next_billing_date, :platform_card_brand, :platform_card_last4)
	`
	_, err := r.db.NamedExecContext(ctx, query, profile)
	return err
}

func (r *merchantRepository) GetPlatformInvoices(ctx context.Context, merchantID uuid.UUID) ([]*models.PlatformInvoice, error) {
	var invoices []*models.PlatformInvoice
	query := `SELECT * FROM platform_invoices WHERE merchant_id = $1 ORDER BY created_at DESC`
	err := r.db.SelectContext(ctx, &invoices, query, merchantID)
	if err != nil && err != sql.ErrNoRows {
		return nil, err
	}
	if invoices == nil {
		invoices = make([]*models.PlatformInvoice, 0)
	}
	return invoices, nil
}
