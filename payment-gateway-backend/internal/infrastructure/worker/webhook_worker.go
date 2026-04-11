package worker

import (
	"bytes"
	"database/sql"
	"net/http"
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/yourcompany/payment-gateway/pkg/logger"
)

type WebhookWorker struct {
	db       *sqlx.DB
	logger   *logger.Logger
	stop     chan struct{}
	jobQueue chan WebhookEvent
}

// WebhookEvent models the webhook_events table
type WebhookEvent struct {
	ID            string    `db:"id"`
	MerchantID    string    `db:"merchant_id"`
	TransactionID string    `db:"transaction_id"`
	EventType     string    `db:"event_type"`
	Payload       string    `db:"payload"` // using string for simple JSON extraction
	Status        string    `db:"status"`
	Attempts      int       `db:"attempts"`
	LastAttempt   *time.Time `db:"last_attempt"`
	NextRetry     time.Time `db:"next_retry"`
	CreatedAt     time.Time `db:"created_at"`
}

func NewWebhookWorker(db *sqlx.DB, logger *logger.Logger) *WebhookWorker {
	return &WebhookWorker{
		db:       db,
		logger:   logger,
		stop:     make(chan struct{}),
		jobQueue: make(chan WebhookEvent, 10000), // Buffer for 10,000 parallel events
	}
}

func (w *WebhookWorker) Start() {
	w.logger.Info("Starting High-Throughput Webhook Delivery Engine")
	
	// Spawn Worker Pool (50 concurrent threads)
	for i := 0; i < 50; i++ {
		go w.worker()
	}

	go w.run()
}

func (w *WebhookWorker) Stop() {
	w.logger.Info("Stopping Webhook Delivery Engine")
	close(w.stop)
}

func (w *WebhookWorker) run() {
	ticker := time.NewTicker(2 * time.Second) // Increased tick rate for high-throughput
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			w.processPendingWebhooks()
		case <-w.stop:
			return
		}
	}
}

func (w *WebhookWorker) worker() {
	for {
		select {
		case event := <-w.jobQueue:
			w.processSingleWebhook(event)
		case <-w.stop:
			return
		}
	}
}

func (w *WebhookWorker) processPendingWebhooks() {
	var events []WebhookEvent
	// Select pending events that are due to be retried
	err := w.db.Select(&events, `
		SELECT 
			id, merchant_id, transaction_id, event_type, 
			payload::text, status, attempts, last_attempt, next_retry, created_at
		FROM webhook_events 
		WHERE status IN ('pending') AND (next_retry <= NOW() OR next_retry IS NULL)
		ORDER BY created_at ASC 
		LIMIT 1000
	`)

	if err != nil && err != sql.ErrNoRows {
		w.logger.Error("Failed to fetch pending webhooks", "error", err)
		return
	}

	for _, event := range events {
		// Non-blocking push to queue; drop or log if fully saturated
		select {
		case w.jobQueue <- event:
			// successfully queued
		default:
			w.logger.Warn("Webhook job queue is full, will retry next tick", "event_id", event.ID)
		}
	}
}

func (w *WebhookWorker) processSingleWebhook(event WebhookEvent) {
	// Look up the merchant's endpoint
	var url string
	err := w.db.Get(&url, `SELECT url FROM webhooks WHERE merchant_id = $1 AND is_active = true LIMIT 1`, event.MerchantID)
	if err != nil {
		w.logger.Warn("Merchant has no active webhook config, marking event skipped", "event_id", event.ID)
		w.updateWebhookStatus(event.ID, "skipped", event.Attempts, time.Now().Add(24*time.Hour*365)) // never retry
		return
	}

	w.logger.Info("Delivering webhook", "event_id", event.ID, "url", url, "attempt_number", event.Attempts+1)

	// Make HTTP POST
	req, err := http.NewRequest("POST", url, bytes.NewBuffer([]byte(event.Payload)))
	if err != nil {
		w.handleFailure(event, "Failed to create request")
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "AdvancedPay-Webhook-Engine/1.0")

	// We could compute HMAC signature here if we fetched the `secret` 
	// from webhooks and signed the payload.

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	
	if err != nil {
		w.handleFailure(event, err.Error())
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		// Success
		w.logger.Info("Webhook delivery successful", "event_id", event.ID, "attempts_used", event.Attempts+1)
		w.updateWebhookStatus(event.ID, "completed", event.Attempts+1, time.Now()) 
	} else {
		w.handleFailure(event, "Non-2xx response")
	}
}

func (w *WebhookWorker) handleFailure(event WebhookEvent, reason string) {
	attempts := event.Attempts + 1
	w.logger.Warn("Webhook delivery failed", "event_id", event.ID, "reason", reason, "attempt", attempts)
	
	var status string
	var nextRetry time.Time

	if attempts >= 5 {
		status = "failed"
		nextRetry = time.Now() // no more retries
	} else {
		status = "pending"
		// Exponential backoff: 1m, 5m, 25m, 2h...
		backoffDuration := time.Minute * time.Duration(1<<(attempts*2))
		nextRetry = time.Now().Add(backoffDuration)
	}

	w.updateWebhookStatus(event.ID, status, attempts, nextRetry)
}

func (w *WebhookWorker) updateWebhookStatus(id string, status string, attempts int, nextRetry time.Time) {
	_, err := w.db.Exec(`
		UPDATE webhook_events 
		SET status = $1, attempts = $2, last_attempt = NOW(), next_retry = $3
		WHERE id = $4
	`, status, attempts, nextRetry, id)
	if err != nil {
		w.logger.Error("Failed to update webhook event status", "event_id", id, "error", err)
	}
}
