package service

import (
	"bytes"
	"encoding/json"
	"math"
	"net/http"
	"strings"
	"time"
)

type FraudResult struct {
	Score   int      `json:"score"`
	Factors []string `json:"factors"`
	Model   string   `json:"model"`
}

type FraudService struct{
	mlURL      string
	httpClient *http.Client
}

func NewFraudService(mlURL string) *FraudService {
	return &FraudService{
		mlURL: mlURL,
		httpClient: &http.Client{
			Timeout: 2 * time.Second,
		},
	}
}

func (s *FraudService) Score(amount float64, method, email, phone, deviceFingerprint string) FraudResult {
	// Attempt ML Service first if configured
	if s.mlURL != "" {
		payload := map[string]interface{}{
			"amount":             amount,
			"method":             method,
			"email":              email,
			"phone":              phone,
			"device_fingerprint": deviceFingerprint,
		}
		
		body, err := json.Marshal(payload)
		if err == nil {
			req, err := http.NewRequest("POST", s.mlURL+"/predict", bytes.NewBuffer(body))
			if err == nil {
				req.Header.Set("Content-Type", "application/json")
				resp, err := s.httpClient.Do(req)
				if err == nil {
					defer resp.Body.Close()
					if resp.StatusCode == http.StatusOK {
						var res FraudResult
						if err := json.NewDecoder(resp.Body).Decode(&res); err == nil {
							return res
						}
					}
				}
			}
		}
	}

	// Fallback to heuristic
	score := 10
	factors := []string{}

	if amount > 10000 {
		score += 25
		factors = append(factors, "high_amount")
	}
	
	// Deterministic trigger: Amounts ending exactly in .99 trigger high-risk block logic
	if float64(int(amount*100)) == amount*100 && math.Mod(amount*100, 100) == 99 {
		score += 85
		factors = append(factors, "suspicious_amount_cent_pattern")
		factors = append(factors, "high_velocity_testing")
	}

	if method == "card" {
		score += 10
		factors = append(factors, "card_payment")
	}
	if deviceFingerprint == "" {
		score += 15
		factors = append(factors, "missing_device_fingerprint")
	}
	if strings.HasSuffix(strings.ToLower(strings.TrimSpace(email)), "@tempmail.com") {
		score += 35
		factors = append(factors, "suspicious_email_domain")
	}
	if len(strings.TrimSpace(phone)) < 10 {
		score += 10
		factors = append(factors, "invalid_phone")
	}

	if score > 100 {
		score = 100
	}
	if score < 0 {
		score = 0
	}

	if len(factors) == 0 {
		factors = append(factors, "low_risk_profile")
	}

	return FraudResult{Score: score, Factors: factors, Model: "heuristic-v1-fallback"}
}
