package repository

import (
	"context"
	"database/sql"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/yourcompany/payment-gateway/internal/domain/models"
)

type BankingRepository interface {
	AddBankAccount(ctx context.Context, account *models.BankAccount) error
	GetBankAccounts(ctx context.Context, merchantID uuid.UUID) ([]models.BankAccount, error)
	CreateWithdrawal(ctx context.Context, withdrawal *models.Withdrawal) error
	GetWithdrawals(ctx context.Context, merchantID uuid.UUID) ([]models.Withdrawal, error)
}

type bankingRepository struct {
	db *sqlx.DB
}

func NewBankingRepository(db *sqlx.DB) BankingRepository {
	return &bankingRepository{db: db}
}

func (r *bankingRepository) AddBankAccount(ctx context.Context, account *models.BankAccount) error {
	query := `
		INSERT INTO bank_accounts (
			id, merchant_id, bank_name, account_number, account_holder,
			ifsc, account_type, is_default, status, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`
	_, err := r.db.ExecContext(ctx, query,
		account.ID, account.MerchantID, account.BankName, account.AccountNumber,
		account.AccountHolder, account.IFSC, account.AccountType, account.IsDefault,
		account.Status, account.CreatedAt, account.UpdatedAt,
	)
	return err
}

func (r *bankingRepository) GetBankAccounts(ctx context.Context, merchantID uuid.UUID) ([]models.BankAccount, error) {
	var accounts []models.BankAccount
	query := `
		SELECT id, merchant_id, bank_name, account_number, account_holder,
		       ifsc, account_type, is_default, status, created_at, updated_at
		FROM bank_accounts
		WHERE merchant_id = $1
		ORDER BY created_at DESC
	`
	err := r.db.SelectContext(ctx, &accounts, query, merchantID)
	if err != nil && err != sql.ErrNoRows {
		return nil, err
	}
	return accounts, nil
}

func (r *bankingRepository) CreateWithdrawal(ctx context.Context, withdrawal *models.Withdrawal) error {
	query := `
		INSERT INTO withdrawals (
			id, merchant_id, amount, status, bank_account_id,
			bank_account_info, utr_number, failure_reason, processed_at, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`
	_, err := r.db.ExecContext(ctx, query,
		withdrawal.ID, withdrawal.MerchantID, withdrawal.Amount, withdrawal.Status,
		withdrawal.BankAccountID, withdrawal.BankAccountInfo, withdrawal.UTRNumber, withdrawal.FailureReason, withdrawal.ProcessedAt, withdrawal.CreatedAt, withdrawal.UpdatedAt,
	)
	return err
}

func (r *bankingRepository) GetWithdrawals(ctx context.Context, merchantID uuid.UUID) ([]models.Withdrawal, error) {
	var withdrawals []models.Withdrawal
	query := `
		SELECT id, merchant_id, amount, status, bank_account_id,
		       bank_account_info, utr_number, failure_reason, processed_at, created_at, updated_at
		FROM withdrawals
		WHERE merchant_id = $1
		ORDER BY created_at DESC
	`
	err := r.db.SelectContext(ctx, &withdrawals, query, merchantID)
	if err != nil && err != sql.ErrNoRows {
		return nil, err
	}
	return withdrawals, nil
}
