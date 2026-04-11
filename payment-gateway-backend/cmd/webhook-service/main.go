package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"

	"github.com/yourcompany/payment-gateway/internal/config"
	"github.com/yourcompany/payment-gateway/internal/domain/repository"
	"github.com/yourcompany/payment-gateway/internal/domain/service"
	"github.com/yourcompany/payment-gateway/internal/infrastructure/database"
	"github.com/yourcompany/payment-gateway/internal/infrastructure/queue"
	"github.com/yourcompany/payment-gateway/pkg/logger"
)

func main() {
	log := logger.NewLogger()
	defer log.Sync()

	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatal("Failed to load configuration", "error", err)
	}

	db, err := database.NewPostgresDB(cfg.Database)
	if err != nil {
		log.Fatal("Failed to connect to database", "error", err)
	}
	defer db.Close()

	webhookRepo := repository.NewWebhookRepository(db)
	webhookService := service.NewWebhookService(webhookRepo, log)

	log.Info("Starting Webhook Delivery Service")

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Initialize Kafka Consumer
	var consumer queue.Consumer
	kafkaConsumer, err := queue.NewKafkaConsumer(cfg.Kafka, log)
	if err != nil {
		consumer = queue.NewNoopConsumer()
		log.Warnw("Kafka not available, using noop consumer", "error", err)
	} else {
		consumer = kafkaConsumer
		defer kafkaConsumer.Close()
	}

	// 1. Run the instant Kafka dispatcher
	go webhookService.ListenAndDispatch(ctx, consumer, cfg.Kafka.Topics.Transactions, "webhook-service-group")

	// 2. Run the fallback DB polling dispatcher for retries
	go webhookService.RunDispatcher(ctx)

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info("Shutting down Webhook Delivery Service")
	cancel()
}
