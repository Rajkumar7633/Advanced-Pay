package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/lib/pq"
	"github.com/yourcompany/payment-gateway/internal/domain/models"
)

type webhookRepository struct {
	db *sqlx.DB
}

func NewWebhookRepository(db *sqlx.DB) WebhookRepository {
	return &webhookRepository{db: db}
}

func (r *webhookRepository) Create(ctx context.Context, webhook *models.Webhook) error {
	query := `
		INSERT INTO webhooks (
			id, merchant_id, url, secret, events, is_active, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`

	_, err := r.db.ExecContext(ctx, query,
		webhook.ID,
		webhook.MerchantID,
		webhook.URL,
		webhook.Secret,
		pq.StringArray(webhook.Events),
		webhook.IsActive,
		webhook.CreatedAt,
		webhook.UpdatedAt,
	)
	return err
}

func (r *webhookRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Webhook, error) {
	query := `
		SELECT id, merchant_id, url, secret, events, is_active, created_at, updated_at
		FROM webhooks
		WHERE id = $1`

	var wh models.Webhook
	var events pq.StringArray
	if err := r.db.QueryRowxContext(ctx, query, id).Scan(
		&wh.ID,
		&wh.MerchantID,
		&wh.URL,
		&wh.Secret,
		&events,
		&wh.IsActive,
		&wh.CreatedAt,
		&wh.UpdatedAt,
	); err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("webhook not found")
		}
		return nil, err
	}
	wh.Events = []string(events)
	return &wh, nil
}

func (r *webhookRepository) List(ctx context.Context, merchantID uuid.UUID) ([]*models.Webhook, error) {
	query := `
		SELECT id, merchant_id, url, secret, events, is_active, created_at, updated_at
		FROM webhooks
		WHERE merchant_id = $1
		ORDER BY created_at DESC`

	rows, err := r.db.QueryxContext(ctx, query, merchantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []*models.Webhook
	for rows.Next() {
		var wh models.Webhook
		var events pq.StringArray
		if err := rows.Scan(
			&wh.ID,
			&wh.MerchantID,
			&wh.URL,
			&wh.Secret,
			&events,
			&wh.IsActive,
			&wh.CreatedAt,
			&wh.UpdatedAt,
		); err != nil {
			return nil, err
		}
		wh.Events = []string(events)
		out = append(out, &wh)
	}
	return out, nil
}

func (r *webhookRepository) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM webhooks WHERE id = $1`, id)
	return err
}

func (r *webhookRepository) CreateEvent(ctx context.Context, event *models.WebhookEvent) error {
	query := `
		INSERT INTO webhook_events (
			id, merchant_id, event_type, transaction_id, payload, status, attempts, last_attempt, next_retry, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`

	payloadJSON, err := json.Marshal(event.Payload)
	if err != nil {
		payloadJSON = []byte(`{}`)
	}

	_, err = r.db.ExecContext(ctx, query,
		event.ID,
		event.MerchantID,
		event.EventType,
		event.TransactionID,
		payloadJSON,
		event.Status,
		event.Attempts,
		event.LastAttempt,
		event.NextRetry,
		event.CreatedAt,
	)
	return err
}

func (r *webhookRepository) GetPendingEvents(ctx context.Context, limit int) ([]*models.WebhookEvent, error) {
	query := `
		SELECT id, merchant_id, event_type, transaction_id, payload, status, attempts, last_attempt, next_retry, created_at
		FROM webhook_events
		WHERE status = 'pending'
		  AND (next_retry IS NULL OR next_retry <= NOW())
		ORDER BY created_at ASC
		LIMIT $1`

	rows, err := r.db.QueryxContext(ctx, query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []*models.WebhookEvent
	for rows.Next() {
		var ev models.WebhookEvent
		var payloadJSON []byte
		if err := rows.Scan(
			&ev.ID,
			&ev.MerchantID,
			&ev.EventType,
			&ev.TransactionID,
			&payloadJSON,
			&ev.Status,
			&ev.Attempts,
			&ev.LastAttempt,
			&ev.NextRetry,
			&ev.CreatedAt,
		); err != nil {
			return nil, err
		}
		if len(payloadJSON) > 0 {
			_ = json.Unmarshal(payloadJSON, &ev.Payload)
		}
		out = append(out, &ev)
	}
	return out, nil
}

func (r *webhookRepository) UpdateEventStatus(ctx context.Context, eventID uuid.UUID, status string, attempts int, nextRetry *time.Time) error {
	query := `
		UPDATE webhook_events
		SET status = $1, attempts = $2, last_attempt = $3, next_retry = $4
		WHERE id = $5`

	now := time.Now()
	_, err := r.db.ExecContext(ctx, query, status, attempts, &now, nextRetry, eventID)
	return err
}
