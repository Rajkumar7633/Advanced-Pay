package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"

	"github.com/yourcompany/payment-gateway/internal/config"
	"github.com/yourcompany/payment-gateway/internal/infrastructure/database"
	_ "github.com/lib/pq"
)

func main() {
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	db, err := database.NewPostgresDB(cfg.Database)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	var merchantID uuid.UUID
	err = db.Get(&merchantID, "SELECT id FROM merchants LIMIT 1")
	if err != nil {
		log.Fatalf("Failed to retrieve merchant: %v", err)
	}

	fmt.Printf("Generating test transactions for Merchant %s...\n", merchantID)

	transactions := []struct {
		Amount float64
		Method string
		Status string
		DaysAgo int
	}{
		{49.99, "card", "success", 0},
		{12.50, "upi", "success", 0},
		{100.00, "wallet", "success", 1},
		{250.00, "card", "success", 2},
		{15.00, "upi", "success", 3},
		{89.99, "card", "success", 4},
		{200.00, "upi", "failed", 0},
		{45.00, "wallet", "success", 5},
		{120.00, "card", "success", 6},
		{35.00, "upi", "success", 7},
	}

	ctx := context.Background()

	for i, t := range transactions {
		txID := uuid.New()
		createdAt := time.Now().AddDate(0, 0, -t.DaysAgo)
		
		decAmount := decimal.NewFromFloat(t.Amount)
		
		_, err := db.ExecContext(ctx, `
			INSERT INTO transactions (
				id, merchant_id, order_id, amount, currency,
				status, payment_method, payment_provider, customer_email, 
				customer_phone, customer_ip, device_fingerprint,
				fraud_score, routing_decision, created_at, updated_at, completed_at
			) VALUES (
				$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
			)
		`, txID, merchantID, fmt.Sprintf("test_order_%d", i), decAmount, "USD",
		t.Status, t.Method, "stripe", "test@customer.com",
		"", "", "",
		10+i, `{"provider":"stripe","confidence":0.95,"factors":["Amount","History"]}`, 
		createdAt, createdAt, createdAt)

		if err != nil {
			log.Fatalf("Failed to insert transaction %d: %v", i, err)
		}
	}

	fmt.Println("Successfully generated 10 distributed mock transactions!")
}
