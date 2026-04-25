package main

import (
	"fmt"
	"log"
	"os"

	"github.com/yourcompany/payment-gateway/internal/config"
	"github.com/yourcompany/payment-gateway/internal/infrastructure/database"
)

func main() {
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	db, err := database.NewPostgresDB(cfg.Database)
	if err != nil {
		log.Fatalf("Failed to connect: %v", err)
	}
	defer db.Close()

	// 1. Sanitize the string fields in transactions
	fmt.Println("Sanitizing transaction table string fields...")
    _, err = db.Exec("UPDATE transactions SET customer_phone = '', customer_ip = '', device_fingerprint = '' WHERE customer_phone IS NULL OR customer_ip IS NULL OR device_fingerprint IS NULL;")
    if err != nil {
        log.Fatalf("Failed to execute data sanitize: %v", err)
    }

	fmt.Println("Applying settlements hotfix...")
	_, err = db.Exec(`ALTER TABLE settlements ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();`)
	if err != nil {
		fmt.Printf("Warning: failed to add updated_at to settlements (maybe already exists): %v\n", err)
	}

	// 2. Run missing Subscriptions migration
	// fmt.Println("Applying 003_subscriptions.sql...")
	// subBytes, err := os.ReadFile("migrations/003_subscriptions.sql")
	// if err != nil {
	// 	log.Fatalf("Failed to read subscription SQL: %v", err)
	// }

	// Because 003_subscriptions.sql has multiple statements, db.Exec executes them.
	// _, err = db.Exec(string(subBytes))
	// if err != nil {
	// 	log.Fatalf("Failed to execute subscription migration: %v", err)
	// }

	// 3. Run KYC Vault migration
	// fmt.Println("Applying 004_kyc_vault.sql...")
	// kycBytes, err := os.ReadFile("migrations/004_kyc_vault.sql")
	// if err != nil {
	// 	log.Fatalf("Failed to read KYC Vault SQL: %v", err)
	// }

	// _, err = db.Exec(string(kycBytes))
	// if err != nil {
	// 	log.Fatalf("Failed to execute KYC Vault SQL: %v", err)
	// }

	// 4. Run Platform Billing migration
	// fmt.Println("Applying 012_platform_billing.sql...")
	// billingBytes, err := os.ReadFile("migrations/012_platform_billing.sql")
	// if err != nil {
	// 	log.Fatalf("Failed to read Platform Billing SQL: %v", err)
	// }

	// _, err = db.Exec(string(billingBytes))
	// if err != nil {
	// 	log.Fatalf("Failed to execute Platform Billing SQL: %v", err)
	// }

	// 5. Run API Keys migration
	fmt.Println("Applying api_keys hotfix...")
	_, err = db.Exec(`ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();`)
	if err != nil {
		log.Fatalf("Failed to execute api_keys schema hotfix: %v", err)
	}

	fmt.Println("Applying 013_create_api_keys.sql...")
	apiBytes, err := os.ReadFile("migrations/013_create_api_keys.sql")
	if err != nil {
		log.Fatalf("Failed to read API keys SQL: %v", err)
	}

	_, err = db.Exec(string(apiBytes))
	if err != nil {
		log.Fatalf("Failed to execute API keys SQL: %v", err)
	}

	fmt.Println("Database schemas patched successfully! Background workers should now run without errors.")
}
