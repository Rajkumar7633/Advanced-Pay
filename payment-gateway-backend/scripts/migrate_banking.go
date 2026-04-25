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

	sqlFile := "migrations/011_create_banking_system.sql"
	bytes, err := os.ReadFile(sqlFile)
	if err != nil {
		log.Fatalf("Failed to read SQL script: %v", err)
	}

	_, err = db.Exec(string(bytes))
	if err != nil {
		log.Fatalf("Failed to execute migration: %v", err)
	}

	fmt.Println("Bank Accounts & Withdrawals Migration executed successfully!")
}
