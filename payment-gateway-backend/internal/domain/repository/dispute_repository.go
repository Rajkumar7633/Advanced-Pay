package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/yourcompany/payment-gateway/internal/domain/models"
)

type DisputeRepository struct {
	db *sqlx.DB
}

func NewDisputeRepository(db *sqlx.DB) *DisputeRepository {
	return &DisputeRepository{db: db}
}

func (r *DisputeRepository) Create(ctx context.Context, d *models.Dispute) error {
	_, err := r.db.NamedExecContext(ctx, `
		INSERT INTO disputes (id, merchant_id, transaction_id, amount, currency, reason, status, description, due_by, created_at, updated_at)
		VALUES (:id, :merchant_id, :transaction_id, :amount, :currency, :reason, :status, :description, :due_by, :created_at, :updated_at)
	`, d)
	return err
}

func (r *DisputeRepository) ListByMerchant(ctx context.Context, merchantID uuid.UUID) ([]models.Dispute, error) {
	var disputes []models.Dispute
	err := r.db.SelectContext(ctx, &disputes, `
		SELECT * FROM disputes WHERE merchant_id = $1 ORDER BY created_at DESC
	`, merchantID)
	if err != nil {
		return nil, err
	}
	return disputes, nil
}

func (r *DisputeRepository) GetByID(ctx context.Context, id uuid.UUID, merchantID uuid.UUID) (*models.Dispute, error) {
	var d models.Dispute
	err := r.db.GetContext(ctx, &d, `
		SELECT * FROM disputes WHERE id = $1 AND merchant_id = $2
	`, id, merchantID)
	if err != nil {
		return nil, err
	}
	return &d, nil
}

func (r *DisputeRepository) SubmitEvidence(ctx context.Context, id uuid.UUID, merchantID uuid.UUID, evidence string) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE disputes SET evidence = $1, status = 'under_review', updated_at = NOW()
		WHERE id = $2 AND merchant_id = $3
	`, evidence, id, merchantID)
	return err
}

func (r *DisputeRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status string) error {
	var resolvedAt *time.Time
	if status == models.DisputeStatusWon || status == models.DisputeStatusLost || status == models.DisputeStatusClosed {
		now := time.Now()
		resolvedAt = &now
	}
	_, err := r.db.ExecContext(ctx, `
		UPDATE disputes SET status = $1, resolved_at = $2, updated_at = NOW() WHERE id = $3
	`, status, resolvedAt, id)
	return err
}

func (r *DisputeRepository) GetStats(ctx context.Context, merchantID uuid.UUID) (map[string]interface{}, error) {
	var total, open, underReview, won, lost int64
	_ = r.db.GetContext(ctx, &total, `SELECT COUNT(*) FROM disputes WHERE merchant_id = $1`, merchantID)
	_ = r.db.GetContext(ctx, &open, `SELECT COUNT(*) FROM disputes WHERE merchant_id = $1 AND status = 'open'`, merchantID)
	_ = r.db.GetContext(ctx, &underReview, `SELECT COUNT(*) FROM disputes WHERE merchant_id = $1 AND status = 'under_review'`, merchantID)
	_ = r.db.GetContext(ctx, &won, `SELECT COUNT(*) FROM disputes WHERE merchant_id = $1 AND status = 'won'`, merchantID)
	_ = r.db.GetContext(ctx, &lost, `SELECT COUNT(*) FROM disputes WHERE merchant_id = $1 AND status = 'lost'`, merchantID)
	return map[string]interface{}{
		"total":        total,
		"open":         open,
		"under_review": underReview,
		"won":          won,
		"lost":         lost,
		"win_rate":     winRate(won, won+lost),
	}, nil
}

func winRate(won, total int64) float64 {
	if total == 0 {
		return 0
	}
	return float64(won) / float64(total) * 100
}
