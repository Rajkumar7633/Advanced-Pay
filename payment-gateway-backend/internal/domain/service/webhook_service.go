package service

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/yourcompany/payment-gateway/internal/domain/models"
	"github.com/yourcompany/payment-gateway/internal/domain/repository"
	"github.com/yourcompany/payment-gateway/internal/infrastructure/queue"
	"github.com/yourcompany/payment-gateway/pkg/logger"
)

type WebhookService struct {
	repo        repository.WebhookRepository
	httpClient  *http.Client
	logger      *logger.Logger
	maxAttempts int
	batchSize   int
}

func (s *WebhookService) GetRepo() repository.WebhookRepository {
	return s.repo
}

func NewWebhookService(repo repository.WebhookRepository, logger *logger.Logger) *WebhookService {
	return &WebhookService{
		repo: repo,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
		logger:      logger,
		maxAttempts: 5,
		batchSize:   25,
	}
}

func (s *WebhookService) CreateWebhook(ctx context.Context, merchantID uuid.UUID, url string, events []string) (*models.Webhook, string, error) {
	secret, err := generateSecretHex(32)
	if err != nil {
		return nil, "", err
	}

	now := time.Now()
	wh := &models.Webhook{
		ID:         uuid.New(),
		MerchantID: merchantID,
		URL:        url,
		Secret:     secret,
		Events:     normalizeEvents(events),
		IsActive:   true,
		CreatedAt:  now,
		UpdatedAt:  now,
	}

	if err := s.repo.Create(ctx, wh); err != nil {
		return nil, "", err
	}

	return wh, secret, nil
}

func (s *WebhookService) ListWebhooks(ctx context.Context, merchantID uuid.UUID) ([]*models.Webhook, error) {
	return s.repo.List(ctx, merchantID)
}

func (s *WebhookService) DeleteWebhook(ctx context.Context, merchantID uuid.UUID, webhookID uuid.UUID) error {
	wh, err := s.repo.GetByID(ctx, webhookID)
	if err != nil {
		return err
	}
	if wh.MerchantID != merchantID {
		return errors.New("unauthorized")
	}
	return s.repo.Delete(ctx, webhookID)
}

func (s *WebhookService) EnqueueTransactionEvent(ctx context.Context, merchantID uuid.UUID, eventType string, txID uuid.UUID, payload map[string]interface{}) error {
	ev := &models.WebhookEvent{
		ID:            uuid.New(),
		MerchantID:    merchantID,
		EventType:     eventType,
		TransactionID: &txID,
		Payload:       payload,
		Status:        "pending",
		Attempts:      0,
		CreatedAt:     time.Now(),
	}
	return s.repo.CreateEvent(ctx, ev)
}

func (s *WebhookService) RunDispatcher(ctx context.Context) {
	if s.repo == nil {
		return
	}

	ticker := time.NewTicker(60 * time.Second) // Slowed down for hybrid retry polling
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			s.dispatchOnce(ctx)
		}
	}
}

func (s *WebhookService) ListenAndDispatch(ctx context.Context, consumer queue.Consumer, topic string, groupID string) {
	s.logger.Info("Starting Kafka listener for webhooks", "topic", topic)
	err := consumer.Consume(ctx, topic, groupID, func(cctx context.Context, message []byte) error {
		var payload map[string]interface{}
		if err := json.Unmarshal(message, &payload); err != nil {
			s.logger.Error("Failed to parse kafka message", "error", err)
			return err
		}

		merchantIDStr, ok := payload["merchant_id"].(string)
		if !ok {
			return errors.New("missing merchant_id in payload")
		}

		merchantID, err := uuid.Parse(merchantIDStr)
		if err != nil {
			return err
		}

		eventType, _ := payload["event_type"].(string)
		if eventType == "" {
			eventType = "unknown"
		}

		webhooks, err := s.repo.List(cctx, merchantID)
		if err != nil {
			return err
		}

		// Create a transient event model for delivery formatting
		ev := &models.WebhookEvent{
			ID:         uuid.New(),
			MerchantID: merchantID,
			EventType:  eventType,
			Payload:    payload,
			CreatedAt:  time.Now(),
		}

		// Extract txID if present
		if txIDStr, ok := payload["transaction_id"].(string); ok {
			if txID, err := uuid.Parse(txIDStr); err == nil {
				ev.TransactionID = &txID
			}
		}

		deliveredAny := false
		for _, wh := range webhooks {
			if !wh.IsActive || !webhookWantsEvent(wh, eventType) {
				continue
			}
			if err := s.deliver(cctx, wh, ev); err != nil {
				s.logger.Error("Instant Kafka webhook delivery failed", "error", err, "url", wh.URL)
				continue
			}
			deliveredAny = true
		}

		if deliveredAny {
			s.logger.Info("Instantly delivered webhook via Kafka", "event", eventType, "merchant", merchantID)
		}

		return nil
	})

	if err != nil {
		s.logger.Error("Failed to start webhook Kafka consumer", "error", err)
	}
}

func (s *WebhookService) dispatchOnce(ctx context.Context) {
	events, err := s.repo.GetPendingEvents(ctx, s.batchSize)
	if err != nil {
		s.logger.Error("Failed to fetch pending webhook events", "error", err)
		return
	}
	if len(events) == 0 {
		return
	}

	for _, ev := range events {
		select {
		case <-ctx.Done():
			return
		default:
		}

		webhooks, err := s.repo.List(ctx, ev.MerchantID)
		if err != nil {
			s.scheduleRetry(ctx, ev, err)
			continue
		}

		deliveredAny := false
		deliveryErr := error(nil)
		for _, wh := range webhooks {
			if !wh.IsActive {
				continue
			}
			if !webhookWantsEvent(wh, ev.EventType) {
				continue
			}

			if err := s.deliver(ctx, wh, ev); err != nil {
				deliveryErr = err
				continue
			}
			deliveredAny = true
		}

		if deliveredAny {
			_ = s.repo.UpdateEventStatus(ctx, ev.ID, "delivered", ev.Attempts+1, nil)
			continue
		}

		if deliveryErr == nil {
			deliveryErr = errors.New("no active webhooks")
		}
		s.scheduleRetry(ctx, ev, deliveryErr)
	}
}

func (s *WebhookService) deliver(ctx context.Context, wh *models.Webhook, ev *models.WebhookEvent) error {
	body := map[string]interface{}{
		"id":         ev.ID.String(),
		"event_type": ev.EventType,
		"created_at": ev.CreatedAt.Unix(),
		"data":       ev.Payload,
	}

	raw, err := json.Marshal(body)
	if err != nil {
		return err
	}

	ts := time.Now().Unix()
	signature := stripeLikeSignature(wh.Secret, ts, raw)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, wh.URL, bytes.NewReader(raw))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Signature", signature)
	req.Header.Set("X-Webhook-Event", ev.EventType)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return errors.New("non-2xx webhook response")
	}

	return nil
}

func (s *WebhookService) scheduleRetry(ctx context.Context, ev *models.WebhookEvent, cause error) {
	attempts := ev.Attempts + 1
	if attempts >= s.maxAttempts {
		_ = s.repo.UpdateEventStatus(ctx, ev.ID, "failed", attempts, nil)
		s.logger.Error("Webhook event failed", "event_id", ev.ID.String(), "event_type", ev.EventType, "error", cause)
		return
	}

	next := time.Now().Add(backoffDuration(attempts))
	_ = s.repo.UpdateEventStatus(ctx, ev.ID, "pending", attempts, &next)
}

func backoffDuration(attempt int) time.Duration {
	base := 10 * time.Second
	shift := attempt
	if shift > 6 {
		shift = 6
	}
	d := base * time.Duration(1<<shift)
	if d > 10*time.Minute {
		return 10 * time.Minute
	}
	return d
}

func stripeLikeSignature(secret string, ts int64, payload []byte) string {
	msg := make([]byte, 0, len(payload)+32)
	msg = append(msg, []byte(strconvI64(ts))...)
	msg = append(msg, '.')
	msg = append(msg, payload...)

	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(msg)
	sig := hex.EncodeToString(mac.Sum(nil))
	return "t=" + strconvI64(ts) + ",v1=" + sig
}

func generateSecretHex(nBytes int) (string, error) {
	b := make([]byte, nBytes)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func normalizeEvents(in []string) []string {
	out := make([]string, 0, len(in))
	seen := map[string]struct{}{}
	for _, e := range in {
		e = strings.TrimSpace(strings.ToLower(e))
		if e == "" {
			continue
		}
		if _, ok := seen[e]; ok {
			continue
		}
		seen[e] = struct{}{}
		out = append(out, e)
	}
	return out
}

func webhookWantsEvent(wh *models.Webhook, eventType string) bool {
	if len(wh.Events) == 0 {
		return true
	}
	eventType = strings.ToLower(eventType)
	for _, e := range wh.Events {
		if strings.ToLower(e) == eventType {
			return true
		}
	}
	return false
}

func strconvI64(n int64) string {
	if n == 0 {
		return "0"
	}

	neg := n < 0
	if neg {
		n = -n
	}

	var buf [32]byte
	i := len(buf)
	for n > 0 {
		i--
		buf[i] = byte('0' + (n % 10))
		n /= 10
	}
	if neg {
		i--
		buf[i] = '-'
	}
	return string(buf[i:])
}
