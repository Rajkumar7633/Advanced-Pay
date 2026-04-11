package service

import (
	"bytes"
	"encoding/json"
	"net/http"
	"time"

	"github.com/yourcompany/payment-gateway/pkg/logger"
)

type RoutingDecision struct {
	Provider    string                 `json:"provider"`
	Confidence  float64                `json:"confidence"`
	Factors     []string               `json:"factors"`
	Meta        map[string]interface{} `json:"meta,omitempty"`
	GeneratedAt time.Time              `json:"generated_at"`
}

type RoutingService struct {
	mlURL  string
	client *http.Client
	logger *logger.Logger
}

func NewRoutingService(mlURL string, logger *logger.Logger) *RoutingService {
	return &RoutingService{
		mlURL:  mlURL,
		client: &http.Client{Timeout: 1 * time.Second}, // extremely fast routing
		logger: logger,
	}
}

func (s *RoutingService) Decide(amount float64, method string, isRecurring bool) RoutingDecision {
	// Rule-based override for native NPCI processor
	if method == "upi" {
		return RoutingDecision{
			Provider:   "npci", // Always use native NPCI for UPI
			Confidence: 1.0,
			Factors:    []string{"native_routing_rule"},
			Meta: map[string]interface{}{
				"amount":       amount,
				"method":       method,
				"ml_status":    "rule_override",
			},
			GeneratedAt: time.Now(),
		}
	}

	// Prepare the baseline deterministic fallback 
	fallback := RoutingDecision{
		Provider:   "razorpay", // Default deterministic Gateway
		Confidence: 0.5,
		Factors:    []string{"fallback_default"},
		Meta: map[string]interface{}{
			"amount":       amount,
			"method":       method,
			"is_recurring": isRecurring,
			"ml_status":    "offline_or_error",
		},
		GeneratedAt: time.Now(),
	}

	payload := map[string]interface{}{
		"amount":       amount,
		"method":       method,
		"is_recurring": isRecurring,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		s.logger.Error("Failed to marshal routing ML payload", "err", err)
		return fallback
	}

	endpoint := s.mlURL + "/route"
	if s.mlURL == "" {
		endpoint = "http://localhost:8000/route"
	}

	req, err := http.NewRequest("POST", endpoint, bytes.NewBuffer(body))
	if err != nil {
		s.logger.Error("Failed to create routing ML request", "err", err)
		return fallback
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		s.logger.Warnw("Routing ML Service unreachable, using fallback array", "err", err)
		return fallback
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		s.logger.Warnw("Routing ML Service returned non-200", "status", resp.StatusCode)
		return fallback
	}

	var result struct {
		Provider   string   `json:"provider"`
		Confidence float64  `json:"confidence"`
		Factors    []string `json:"factors"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		s.logger.Error("Failed to decode routing ML response", "err", err)
		return fallback
	}

	return RoutingDecision{
		Provider:   result.Provider,
		Confidence: result.Confidence,
		Factors:    result.Factors,
		Meta: map[string]interface{}{
			"amount":       amount,
			"method":       method,
			"is_recurring": isRecurring,
			"ml_status":    "active",
		},
		GeneratedAt: time.Now(),
	}
}
