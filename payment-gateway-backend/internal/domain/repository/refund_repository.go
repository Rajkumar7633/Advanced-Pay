package repository

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/yourcompany/payment-gateway/internal/domain/models"
)

type refundRepository struct {
	db *sqlx.DB
}

func NewRefundRepository(db *sqlx.DB) RefundRepository {
	return &refundRepository{db: db}
}

func (r *refundRepository) Create(ctx context.Context, refund *models.Refund) error {
	query := `
		INSERT INTO refunds (
			id, transaction_id, amount, reason, status, processed_at, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7)`

	_, err := r.db.ExecContext(ctx, query,
		refund.ID,
		refund.TransactionID,
		refund.Amount,
		refund.Reason,
		refund.Status,
		refund.ProcessedAt,
		refund.CreatedAt,
	)
	return err
}

func (r *refundRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Refund, error) {
	query := `
		SELECT id, transaction_id, amount, reason, status, processed_at, created_at
		FROM refunds
		WHERE id = $1`

	var rf models.Refund
	if err := r.db.GetContext(ctx, &rf, query, id); err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("refund not found")
		}
		return nil, err
	}
	return &rf, nil
}

func (r *refundRepository) GetByTransactionID(ctx context.Context, txID uuid.UUID) ([]*models.Refund, error) {
	query := `
		SELECT id, transaction_id, amount, reason, status, processed_at, created_at
		FROM refunds
		WHERE transaction_id = $1
		ORDER BY created_at DESC`

	var rows []*models.Refund
	if err := r.db.SelectContext(ctx, &rows, query, txID); err != nil {
		return nil, err
	}
	return rows, nil
}

func (r *refundRepository) Update(ctx context.Context, refund *models.Refund) error {
	query := `
		UPDATE refunds
		SET amount = $1, reason = $2, status = $3, processed_at = $4
		WHERE id = $5`

	_, err := r.db.ExecContext(ctx, query,
		refund.Amount,
		refund.Reason,
		refund.Status,
		refund.ProcessedAt,
		refund.ID,
	)
	return err
}

func (r *refundRepository) nowPtr() *time.Time {
	n := time.Now()
	return &n
}
