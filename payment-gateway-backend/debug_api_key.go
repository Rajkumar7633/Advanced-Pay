package main

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/yourcompany/payment-gateway/internal/config"
	"github.com/yourcompany/payment-gateway/internal/domain/repository"
	"github.com/yourcompany/payment-gateway/internal/domain/service"
	"github.com/yourcompany/payment-gateway/internal/infrastructure/database"
	"github.com/yourcompany/payment-gateway/pkg/logger"
)

func main() {
	cfg, err := config.LoadConfig()
	if err != nil {
		fmt.Printf("CFG ERROR: %v\n", err)
		return
	}
	db, err := database.NewPostgresDB(cfg.Database)
	if err != nil {
		fmt.Printf("DB ERROR: %v\n", err)
		return
	}
	defer db.Close()
	apiLog := logger.NewLogger()
	merchantRepo := repository.NewMerchantRepository(db)

	merchantSvc := service.NewMerchantService(merchantRepo, nil, nil, nil, apiLog)

	mid, _ := uuid.Parse("ef7ce55b-8f0b-4ddf-ba4d-f118b2e4817c")
	_, _, err = merchantSvc.CreateApiKey(context.Background(), mid, "test")

	if err != nil {
		fmt.Printf("ERROR FROM SERVICE: %v\n", err)
	} else {
		fmt.Printf("SUCCESS\n")
	}
}
