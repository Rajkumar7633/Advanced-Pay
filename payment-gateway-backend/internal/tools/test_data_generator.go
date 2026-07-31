package tools

import (
	"fmt"
	"math/rand"
	"time"

	"github.com/google/uuid"
)

// TestDataGenerator generates test data for the payment gateway
type TestDataGenerator struct {
	rand *rand.Rand
}

// NewTestDataGenerator creates a new test data generator
func NewTestDataGenerator() *TestDataGenerator {
	return &TestDataGenerator{
		rand: rand.New(rand.NewSource(time.Now().UnixNano())),
	}
}

// GeneratePayment generates a random payment
func (g *TestDataGenerator) GeneratePayment() map[string]interface{} {
	paymentMethods := []string{"card", "upi", "netbanking", "wallet", "bnpl"}
	statuses := []string{"pending", "processing", "completed", "failed", "refunded"}
	currencies := []string{"INR", "USD", "EUR", "GBP", "AED"}

	return map[string]interface{}{
		"id":             uuid.New().String(),
		"order_id":       fmt.Sprintf("order_%d", g.rand.Intn(1000000)),
		"amount":         float64(g.rand.Intn(100000)) / 100.0,
		"currency":       currencies[g.rand.Intn(len(currencies))],
		"status":         statuses[g.rand.Intn(len(statuses))],
		"payment_method": paymentMethods[g.rand.Intn(len(paymentMethods))],
		"customer_email": fmt.Sprintf("customer%d@example.com", g.rand.Intn(1000)),
		"customer_phone": fmt.Sprintf("+91%d", g.rand.Intn(10000000000)),
		"created_at":     time.Now().Add(-time.Duration(g.rand.Intn(86400)) * time.Second).Format(time.RFC3339),
		"updated_at":     time.Now().Format(time.RFC3339),
	}
}

// GenerateTransaction generates a random transaction
func (g *TestDataGenerator) GenerateTransaction() map[string]interface{} {
	providers := []string{"razorpay", "stripe", "npci"}
	statuses := []string{"pending", "success", "failed", "refunded"}
	methods := []string{"card", "upi", "netbanking", "wallet", "bnpl"}

	return map[string]interface{}{
		"id":                      uuid.New().String(),
		"payment_id":              uuid.New().String(),
		"amount":                  float64(g.rand.Intn(100000)) / 100.0,
		"currency":                "INR",
		"status":                  statuses[g.rand.Intn(len(statuses))],
		"payment_method":          methods[g.rand.Intn(len(methods))],
		"provider":                providers[g.rand.Intn(len(providers))],
		"provider_transaction_id": fmt.Sprintf("provider_txn_%d", g.rand.Intn(1000000)),
		"created_at":              time.Now().Add(-time.Duration(g.rand.Intn(86400)) * time.Second).Format(time.RFC3339),
		"updated_at":              time.Now().Format(time.RFC3339),
		"fraud_score":             float64(g.rand.Intn(100)) / 100.0,
	}
}

// GenerateMerchant generates a random merchant
func (g *TestDataGenerator) GenerateMerchant() map[string]interface{} {
	statuses := []string{"active", "inactive", "suspended"}

	return map[string]interface{}{
		"id":         uuid.New().String(),
		"name":       fmt.Sprintf("Merchant %d", g.rand.Intn(1000)),
		"email":      fmt.Sprintf("merchant%d@example.com", g.rand.Intn(1000)),
		"api_key":    fmt.Sprintf("sk_test_%s", uuid.New().String()),
		"status":     statuses[g.rand.Intn(len(statuses))],
		"created_at": time.Now().Add(-time.Duration(g.rand.Intn(86400*30)) * time.Second).Format(time.RFC3339),
		"updated_at": time.Now().Format(time.RFC3339),
	}
}

// GenerateCustomer generates a random customer
func (g *TestDataGenerator) GenerateCustomer() map[string]interface{} {
	return map[string]interface{}{
		"id":         uuid.New().String(),
		"name":       fmt.Sprintf("Customer %d", g.rand.Intn(1000)),
		"email":      fmt.Sprintf("customer%d@example.com", g.rand.Intn(1000)),
		"phone":      fmt.Sprintf("+91%d", g.rand.Intn(10000000000)),
		"created_at": time.Now().Add(-time.Duration(g.rand.Intn(86400*30)) * time.Second).Format(time.RFC3339),
	}
}

// GenerateWebhook generates a random webhook
func (g *TestDataGenerator) GenerateWebhook() map[string]interface{} {
	events := []string{"payment.created", "payment.completed", "payment.failed", "payment.refunded"}

	return map[string]interface{}{
		"id":          uuid.New().String(),
		"merchant_id": uuid.New().String(),
		"url":         fmt.Sprintf("https://example.com/webhook/%d", g.rand.Intn(1000)),
		"secret":      fmt.Sprintf("whsec_%s", uuid.New().String()),
		"events":      []string{events[g.rand.Intn(len(events))]},
		"is_active":   g.rand.Intn(2) == 1,
		"created_at":  time.Now().Add(-time.Duration(g.rand.Intn(86400*30)) * time.Second).Format(time.RFC3339),
		"updated_at":  time.Now().Format(time.RFC3339),
	}
}

// GeneratePayments generates multiple random payments
func (g *TestDataGenerator) GeneratePayments(count int) []map[string]interface{} {
	payments := make([]map[string]interface{}, count)
	for i := 0; i < count; i++ {
		payments[i] = g.GeneratePayment()
	}
	return payments
}

// GenerateTransactions generates multiple random transactions
func (g *TestDataGenerator) GenerateTransactions(count int) []map[string]interface{} {
	transactions := make([]map[string]interface{}, count)
	for i := 0; i < count; i++ {
		transactions[i] = g.GenerateTransaction()
	}
	return transactions
}

// GenerateMerchants generates multiple random merchants
func (g *TestDataGenerator) GenerateMerchants(count int) []map[string]interface{} {
	merchants := make([]map[string]interface{}, count)
	for i := 0; i < count; i++ {
		merchants[i] = g.GenerateMerchant()
	}
	return merchants
}

// GenerateCustomers generates multiple random customers
func (g *TestDataGenerator) GenerateCustomers(count int) []map[string]interface{} {
	customers := make([]map[string]interface{}, count)
	for i := 0; i < count; i++ {
		customers[i] = g.GenerateCustomer()
	}
	return customers
}

// GenerateWebhooks generates multiple random webhooks
func (g *TestDataGenerator) GenerateWebhooks(count int) []map[string]interface{} {
	webhooks := make([]map[string]interface{}, count)
	for i := 0; i < count; i++ {
		webhooks[i] = g.GenerateWebhook()
	}
	return webhooks
}

// GenerateRealisticPayments generates payments with realistic distribution
func (g *TestDataGenerator) GenerateRealisticPayments(count int) []map[string]interface{} {
	payments := make([]map[string]interface{}, count)

	for i := 0; i < count; i++ {
		// Weighted distribution for payment methods
		method := g.weightedChoice([]string{"card", "upi", "netbanking", "wallet", "bnpl"}, []float64{0.4, 0.3, 0.15, 0.1, 0.05})

		// Weighted distribution for status (more completed than failed)
		status := g.weightedChoice([]string{"completed", "failed", "pending", "refunded"}, []float64{0.85, 0.1, 0.03, 0.02})

		// Realistic amount distribution (most payments under 5000)
		amount := g.realisticAmount()

		payments[i] = map[string]interface{}{
			"id":             uuid.New().String(),
			"order_id":       fmt.Sprintf("order_%d", g.rand.Intn(1000000)),
			"amount":         amount,
			"currency":       "INR",
			"status":         status,
			"payment_method": method,
			"customer_email": fmt.Sprintf("customer%d@example.com", g.rand.Intn(1000)),
			"customer_phone": fmt.Sprintf("+91%d", g.rand.Intn(10000000000)),
			"created_at":     time.Now().Add(-time.Duration(g.rand.Intn(86400*30)) * time.Second).Format(time.RFC3339),
			"updated_at":     time.Now().Format(time.RFC3339),
		}
	}

	return payments
}

// weightedChoice selects an option based on weights
func (g *TestDataGenerator) weightedChoice(options []string, weights []float64) string {
	totalWeight := 0.0
	for _, w := range weights {
		totalWeight += w
	}

	r := g.rand.Float64() * totalWeight
	cumulative := 0.0

	for i, w := range weights {
		cumulative += w
		if r <= cumulative {
			return options[i]
		}
	}

	return options[len(options)-1]
}

// realisticAmount generates a realistic payment amount
func (g *TestDataGenerator) realisticAmount() float64 {
	// Most payments are small amounts
	if g.rand.Float64() < 0.7 {
		return float64(g.rand.Intn(5000)) / 100.0
	}
	// Some are medium amounts
	if g.rand.Float64() < 0.9 {
		return float64(5000+g.rand.Intn(45000)) / 100.0
	}
	// Few are large amounts
	return float64(50000+g.rand.Intn(950000)) / 100.0
}

// GenerateTimeSeriesData generates time series data for analytics
func (g *TestDataGenerator) GenerateTimeSeriesData(days int) []map[string]interface{} {
	data := make([]map[string]interface{}, days)

	for i := 0; i < days; i++ {
		date := time.Now().AddDate(0, 0, -i)
		transactions := 100 + g.rand.Intn(900)
		revenue := float64(transactions) * float64(100+g.rand.Intn(400))
		successRate := 95 + g.rand.Intn(5)

		data[i] = map[string]interface{}{
			"date":         date.Format("2006-01-02"),
			"transactions": transactions,
			"revenue":      revenue,
			"success_rate": float64(successRate),
		}
	}

	return data
}

// GenerateFraudData generates fraud detection test data
func (g *TestDataGenerator) GenerateFraudData(count int) []map[string]interface{} {
	data := make([]map[string]interface{}, count)

	for i := 0; i < count; i++ {
		// Most transactions are low risk
		riskLevel := g.weightedChoice([]string{"low", "medium", "high", "critical"}, []float64{0.85, 0.1, 0.04, 0.01})
		fraudScore := 0.0

		switch riskLevel {
		case "low":
			fraudScore = float64(g.rand.Intn(30)) / 100.0
		case "medium":
			fraudScore = 0.3 + float64(g.rand.Intn(30))/100.0
		case "high":
			fraudScore = 0.6 + float64(g.rand.Intn(20))/100.0
		case "critical":
			fraudScore = 0.8 + float64(g.rand.Intn(20))/100.0
		}

		data[i] = map[string]interface{}{
			"transaction_id": uuid.New().String(),
			"fraud_score":    fraudScore,
			"risk_level":     riskLevel,
			"blocked":        riskLevel == "high" || riskLevel == "critical",
		}
	}

	return data
}

// GenerateSubscriptionData generates subscription test data
func (g *TestDataGenerator) GenerateSubscriptionData(count int) []map[string]interface{} {
	data := make([]map[string]interface{}, count)

	for i := 0; i < count; i++ {
		intervals := []string{"daily", "weekly", "monthly", "yearly"}
		statuses := []string{"active", "paused", "cancelled", "completed"}

		data[i] = map[string]interface{}{
			"subscription_id": uuid.New().String(),
			"customer_id":     uuid.New().String(),
			"plan_id":         fmt.Sprintf("plan_%d", g.rand.Intn(10)),
			"amount":          float64(100 + g.rand.Intn(900)),
			"currency":        "INR",
			"interval":        intervals[g.rand.Intn(len(intervals))],
			"status":          statuses[g.rand.Intn(len(statuses))],
			"created_at":      time.Now().Add(-time.Duration(g.rand.Intn(86400*365)) * time.Second).Format(time.RFC3339),
		}
	}

	return data
}

// GenerateSettlementData generates settlement test data
func (g *TestDataGenerator) GenerateSettlementData(count int) []map[string]interface{} {
	data := make([]map[string]interface{}, count)

	for i := 0; i < count; i++ {
		statuses := []string{"pending", "processing", "completed", "failed"}

		data[i] = map[string]interface{}{
			"settlement_id":   uuid.New().String(),
			"merchant_id":     uuid.New().String(),
			"amount":          float64(10000 + g.rand.Intn(90000)),
			"currency":        "INR",
			"status":          statuses[g.rand.Intn(len(statuses))],
			"settlement_date": time.Now().Add(-time.Duration(g.rand.Intn(86400*7)) * time.Second).Format(time.RFC3339),
		}
	}

	return data
}
