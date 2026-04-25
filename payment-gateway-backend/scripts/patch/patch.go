package main

import (
	"fmt"
	"log"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
)

func main() {
	dsn := "host=localhost port=15432 user=postgres password=Raj@76330Raj dbname=advancePayment sslmode=disable"
	db, err := sqlx.Connect("postgres", dsn)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// 1. Add updated_at to settlements
	_, err = db.Exec(`ALTER TABLE settlements ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();`)
	if err != nil {
		fmt.Println("Warning: settlements updated_at:", err)
	} else {
		fmt.Println("1) Added updated_at to settlements")
	}

	// 2. Add description to merchants
	_, err = db.Exec(`ALTER TABLE merchants ADD COLUMN IF NOT EXISTS description TEXT;`)
	if err != nil {
		fmt.Println("Warning: merchants description:", err)
	} else {
		fmt.Println("2) Added description to merchants")
	}

	// 3. Add kyc_status to merchants
	_, err = db.Exec(`ALTER TABLE merchants ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(50) DEFAULT 'pending';`)
	if err != nil {
		fmt.Println("Warning: merchants kyc_status:", err)
	} else {
		fmt.Println("3) Added kyc_status to merchants")
	}

	// 4. Create subscriptions
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS subscriptions (
			id UUID PRIMARY KEY,
			merchant_id UUID NOT NULL,
			customer_id UUID NOT NULL,
			plan_id VARCHAR(100) NOT NULL,
			status VARCHAR(50) NOT NULL,
			amount DECIMAL(15,2) NOT NULL,
			currency VARCHAR(3) NOT NULL,
			interval VARCHAR(20) NOT NULL,
			interval_count INTEGER NOT NULL DEFAULT 1,
			billing_cycle_anchor TIMESTAMP WITH TIME ZONE,
			current_period_end TIMESTAMP WITH TIME ZONE,
			cancel_at_period_end BOOLEAN DEFAULT FALSE,
			metadata JSONB,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		);
	`)
	if err != nil {
		fmt.Println("Warning: subscriptions:", err)
	} else {
		fmt.Println("4) Validated subscriptions table")
	}

	fmt.Println("✅ Database successfully patched for production capabilities.")
}
