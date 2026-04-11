package repository

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/yourcompany/payment-gateway/internal/domain/models"
)

type settlementRepository struct {
	db *sqlx.DB
}

func NewSettlementRepository(db *sqlx.DB) SettlementRepository {
	return &settlementRepository{db: db}
}

func (r *settlementRepository) Create(ctx context.Context, settlement *models.Settlement) error {
	query := `
		INSERT INTO settlements (
			id, merchant_id, settlement_date, total_amount, total_transactions,
			fees, tax, net_amount, status, utr_number, settled_at, created_at, updated_at
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`

	_, err := r.db.ExecContext(ctx, query,
		settlement.ID,
		settlement.MerchantID,
		settlement.SettlementDate,
		settlement.TotalAmount,
		settlement.TotalTransactions,
		settlement.Fees,
		settlement.Tax,
		settlement.NetAmount,
		settlement.Status,
		settlement.UTRNumber,
		settlement.SettledAt,
		settlement.CreatedAt,
		settlement.UpdatedAt,
	)
	return err
}

func (r *settlementRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Settlement, error) {
	query := `
		SELECT id, merchant_id, settlement_date, total_amount, total_transactions,
		       fees, tax, net_amount, status, utr_number, settled_at, created_at
		FROM settlements
		WHERE id = $1`

	var s models.Settlement
	if err := r.db.GetContext(ctx, &s, query, id); err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("settlement not found")
		}
		return nil, err
	}
	return &s, nil
}

func (r *settlementRepository) List(ctx context.Context, merchantID uuid.UUID) ([]*models.Settlement, error) {
	query := `
		SELECT id, merchant_id, settlement_date, total_amount, total_transactions,
		       fees, tax, net_amount, status, utr_number, settled_at, created_at
		FROM settlements
		WHERE merchant_id = $1
		ORDER BY settlement_date DESC, created_at DESC`

	var out []*models.Settlement
	if err := r.db.SelectContext(ctx, &out, query, merchantID); err != nil {
		return nil, err
	}
	return out, nil
}

func (r *settlementRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status string, utrNumber string) error {
	query := `
		UPDATE settlements
		SET status = $1, utr_number = $2, settled_at = CASE WHEN $1 = 'settled' THEN NOW() ELSE settled_at END
		WHERE id = $3`

	_, err := r.db.ExecContext(ctx, query, status, utrNumber, id)
	return err
}
