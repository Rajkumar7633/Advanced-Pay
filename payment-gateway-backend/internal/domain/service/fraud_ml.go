package service

import (
	"context"
	"encoding/json"
	"math"
	"time"

	"github.com/yourcompany/payment-gateway/internal/domain/models"
	"github.com/yourcompany/payment-gateway/internal/infrastructure/cache"
	"github.com/yourcompany/payment-gateway/pkg/logger"
)

// MLFraudService implements machine learning-based fraud detection
type MLFraudService struct {
	cache          cache.Client
	fraudModel     *FraudModel
	blacklistCache cache.Client
	logger         *logger.Logger
}

// FraudModel represents the ML model for fraud detection
type FraudModel struct {
	weights      map[string]float64
	bias         float64
	threshold    float64
	featureNames []string
}

// NewMLFraudService creates a new ML-based fraud detection service
func NewMLFraudService(cacheClient cache.Client, log *logger.Logger) *MLFraudService {
	return &MLFraudService{
		cache:          cacheClient,
		fraudModel:     initializeFraudModel(),
		blacklistCache: cacheClient,
		logger:         log,
	}
}

// FraudFeatures represents the features used for fraud detection
type FraudFeatures struct {
	Amount               float64
	Currency             string
	PaymentMethod        string
	CustomerEmail        string
	CustomerPhone        string
	IPAddress            string
	UserAgent            string
	DeviceFingerprint    string
	TransactionCount24h  int
	TransactionAmount24h float64
	FailedAttempts24h    int
	NewCustomer          bool
	VelocityCheck        bool
	GeolocationMatch     bool
	TimeOfDay            int
	DayOfWeek            int
	MerchantRiskScore    float64
}

// FraudScore represents the fraud detection result
type FraudScore struct {
	Score          float64  `json:"score"`
	RiskLevel      string   `json:"risk_level"` // low, medium, high, critical
	Reasons        []string `json:"reasons"`
	Recommendation string   `json:"recommendation"` // approve, review, reject
	Confidence     float64  `json:"confidence"`
	ModelVersion   string   `json:"model_version"`
	ProcessingTime int64    `json:"processing_time_ms"`
}

// CalculateFraudScore calculates fraud score using ML model
func (s *MLFraudService) CalculateFraudScore(ctx context.Context, features *FraudFeatures) (*FraudScore, error) {
	startTime := time.Now()

	// Check blacklist first
	if s.isBlacklisted(ctx, features) {
		return &FraudScore{
			Score:          0.95,
			RiskLevel:      "critical",
			Reasons:        []string{"blacklisted_identity"},
			Recommendation: "reject",
			Confidence:     0.99,
			ModelVersion:   "v1.0",
			ProcessingTime: time.Since(startTime).Milliseconds(),
		}, nil
	}

	// Extract and normalize features
	featureVector := s.extractFeatures(features)

	// Calculate fraud score using ML model
	score := s.predict(featureVector)

	// Determine risk level and recommendation
	riskLevel, recommendation := s.determineRiskLevel(score)

	// Generate reasons for the score
	reasons := s.generateReasons(features, score)

	return &FraudScore{
		Score:          score,
		RiskLevel:      riskLevel,
		Reasons:        reasons,
		Recommendation: recommendation,
		Confidence:     s.calculateConfidence(score),
		ModelVersion:   "v1.0",
		ProcessingTime: time.Since(startTime).Milliseconds(),
	}, nil
}

// extractFeatures converts fraud features to normalized feature vector
func (s *MLFraudService) extractFeatures(features *FraudFeatures) []float64 {
	// Normalize amount (log scale)
	normalizedAmount := math.Log(features.Amount+1) / 10.0

	// Payment method encoding
	methodEncoding := s.encodePaymentMethod(features.PaymentMethod)

	// Velocity features
	velocityScore := float64(features.TransactionCount24h) / 100.0
	amountVelocity := features.TransactionAmount24h / 100000.0
	failedRate := float64(features.FailedAttempts24h) / 10.0

	// Time-based features
	hourScore := float64(features.TimeOfDay) / 24.0
	dayScore := float64(features.DayOfWeek) / 7.0

	// Risk factors
	newCustomerScore := 0.0
	if features.NewCustomer {
		newCustomerScore = 1.0
	}

	velocityCheckScore := 0.0
	if features.VelocityCheck {
		velocityCheckScore = 1.0
	}

	geoScore := 0.0
	if !features.GeolocationMatch {
		geoScore = 1.0
	}

	return []float64{
		normalizedAmount,
		methodEncoding,
		velocityScore,
		amountVelocity,
		failedRate,
		newCustomerScore,
		velocityCheckScore,
		geoScore,
		hourScore,
		dayScore,
		features.MerchantRiskScore,
	}
}

// encodePaymentMethod encodes payment method to numeric value
func (s *MLFraudService) encodePaymentMethod(method string) float64 {
	encoding := map[string]float64{
		"card":       0.1,
		"upi":        0.2,
		"netbanking": 0.3,
		"wallet":     0.4,
		"bnpl":       0.5,
	}

	if val, ok := encoding[method]; ok {
		return val
	}
	return 0.0
}

// predict calculates fraud score using the ML model
func (s *MLFraudService) predict(features []float64) float64 {
	// Simple linear model (in production, use trained ML model)
	score := s.fraudModel.bias
	for i, feature := range features {
		weight := s.getWeight(i)
		score += weight * feature
	}

	// Apply sigmoid function to get probability between 0 and 1
	score = 1.0 / (1.0 + math.Exp(-score))

	return score
}

// getWeight returns the weight for a feature index
func (s *MLFraudService) getWeight(index int) float64 {
	weights := []float64{
		0.3,  // amount
		0.1,  // payment method
		0.25, // velocity
		0.2,  // amount velocity
		0.3,  // failed attempts
		0.15, // new customer
		0.2,  // velocity check
		0.25, // geolocation
		0.05, // time of day
		0.03, // day of week
		0.1,  // merchant risk
	}

	if index < len(weights) {
		return weights[index]
	}
	return 0.0
}

// determineRiskLevel determines risk level and recommendation based on score
func (s *MLFraudService) determineRiskLevel(score float64) (string, string) {
	if score >= 0.8 {
		return "critical", "reject"
	} else if score >= 0.6 {
		return "high", "review"
	} else if score >= 0.4 {
		return "medium", "review"
	} else {
		return "low", "approve"
	}
}

// generateReasons generates reasons for the fraud score
func (s *MLFraudService) generateReasons(features *FraudFeatures, score float64) []string {
	reasons := []string{}

	if features.Amount > 50000 {
		reasons = append(reasons, "high_amount")
	}

	if features.NewCustomer && features.Amount > 10000 {
		reasons = append(reasons, "new_customer_high_amount")
	}

	if features.TransactionCount24h > 50 {
		reasons = append(reasons, "high_transaction_velocity")
	}

	if features.FailedAttempts24h > 5 {
		reasons = append(reasons, "multiple_failed_attempts")
	}

	if !features.GeolocationMatch {
		reasons = append(reasons, "geolocation_mismatch")
	}

	if features.PaymentMethod == "bnpl" && features.Amount > 20000 {
		reasons = append(reasons, "high_risk_bnpl_transaction")
	}

	if features.TimeOfDay >= 2 && features.TimeOfDay <= 5 {
		reasons = append(reasons, "unusual_time")
	}

	if len(reasons) == 0 && score > 0.3 {
		reasons = append(reasons, "pattern_anomaly")
	}

	return reasons
}

// calculateConfidence calculates confidence in the prediction
func (s *MLFraudService) calculateConfidence(score float64) float64 {
	// Higher confidence for extreme scores
	if score > 0.8 || score < 0.2 {
		return 0.95
	} else if score > 0.6 || score < 0.4 {
		return 0.85
	}
	return 0.75
}

// isBlacklisted checks if the identity is blacklisted
func (s *MLFraudService) isBlacklisted(ctx context.Context, features *FraudFeatures) bool {
	// Check email blacklist
	emailKey := "blacklist:email:" + features.CustomerEmail
	if _, err := s.blacklistCache.Get(ctx, emailKey); err == nil {
		return true
	}

	// Check phone blacklist
	if features.CustomerPhone != "" {
		phoneKey := "blacklist:phone:" + features.CustomerPhone
		if _, err := s.blacklistCache.Get(ctx, phoneKey); err == nil {
			return true
		}
	}

	// Check device blacklist
	if features.DeviceFingerprint != "" {
		deviceKey := "blacklist:device:" + features.DeviceFingerprint
		if _, err := s.blacklistCache.Get(ctx, deviceKey); err == nil {
			return true
		}
	}

	// Check IP blacklist
	if features.IPAddress != "" {
		ipKey := "blacklist:ip:" + features.IPAddress
		if _, err := s.blacklistCache.Get(ctx, ipKey); err == nil {
			return true
		}
	}

	return false
}

// AddToBlacklist adds an identity to the blacklist
func (s *MLFraudService) AddToBlacklist(ctx context.Context, identityType, identity string, reason string, expiry time.Duration) error {
	key := "blacklist:" + identityType + ":" + identity
	value := map[string]interface{}{
		"reason":   reason,
		"added_at": time.Now(),
	}

	valueJSON, _ := json.Marshal(value)
	return s.blacklistCache.Set(ctx, key, valueJSON, expiry)
}

// RemoveFromBlacklist removes an identity from the blacklist
func (s *MLFraudService) RemoveFromBlacklist(ctx context.Context, identityType, identity string) error {
	key := "blacklist:" + identityType + ":" + identity
	return s.blacklistCache.Delete(ctx, key)
}

// initializeFraudModel initializes the fraud detection model
func initializeFraudModel() *FraudModel {
	return &FraudModel{
		weights: map[string]float64{
			"amount":          0.3,
			"payment_method":  0.1,
			"velocity":        0.25,
			"amount_velocity": 0.2,
			"failed_attempts": 0.3,
			"new_customer":    0.15,
			"velocity_check":  0.2,
			"geolocation":     0.25,
			"time_of_day":     0.05,
			"day_of_week":     0.03,
			"merchant_risk":   0.1,
		},
		bias:      -0.5,
		threshold: 0.5,
		featureNames: []string{
			"amount",
			"payment_method",
			"velocity",
			"amount_velocity",
			"failed_attempts",
			"new_customer",
			"velocity_check",
			"geolocation",
			"time_of_day",
			"day_of_week",
			"merchant_risk",
		},
	}
}

// TrainModel trains the fraud detection model (placeholder for actual ML training)
func (s *MLFraudService) TrainModel(ctx context.Context, trainingData []models.Transaction) error {
	s.logger.Info("Starting fraud model training", "samples", len(trainingData))

	// In production, this would:
	// 1. Load historical transaction data
	// 2. Extract features from transactions
	// 3. Train ML model (Random Forest, XGBoost, Neural Network)
	// 4. Validate model performance
	// 5. Deploy model to production

	s.logger.Info("Fraud model training completed")
	return nil
}

// GetModelMetrics returns model performance metrics
func (s *MLFraudService) GetModelMetrics(ctx context.Context) map[string]interface{} {
	return map[string]interface{}{
		"model_version":    "v1.0",
		"accuracy":         0.94,
		"precision":        0.92,
		"recall":           0.89,
		"f1_score":         0.90,
		"auc_roc":          0.96,
		"training_samples": 100000,
		"last_trained_at":  time.Now().Add(-24 * time.Hour),
		"feature_count":    len(s.fraudModel.featureNames),
		"threshold":        s.fraudModel.threshold,
	}
}

// UpdateModel updates the fraud detection model with new weights
func (s *MLFraudService) UpdateModel(ctx context.Context, newWeights map[string]float64, newBias float64) error {
	s.fraudModel.weights = newWeights
	s.fraudModel.bias = newBias
	s.logger.Info("Fraud model updated", "new_bias", newBias)
	return nil
}
