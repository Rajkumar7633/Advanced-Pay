package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/yourcompany/payment-gateway/internal/api/handlers"
	"github.com/yourcompany/payment-gateway/internal/api/middleware"
	"github.com/yourcompany/payment-gateway/internal/config"
	"github.com/yourcompany/payment-gateway/internal/domain/repository"
	"github.com/yourcompany/payment-gateway/internal/domain/service"
	"github.com/yourcompany/payment-gateway/internal/infrastructure/cache"
	"github.com/yourcompany/payment-gateway/internal/infrastructure/database"
	"github.com/yourcompany/payment-gateway/internal/infrastructure/queue"
	ws "github.com/yourcompany/payment-gateway/internal/infrastructure/websocket"
	"github.com/yourcompany/payment-gateway/internal/infrastructure/worker"
	"github.com/yourcompany/payment-gateway/pkg/logger"
)

func main() {
	// Initialize logger
	log := logger.NewLogger()
	defer log.Sync()

	// Load configuration
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatal("Failed to load configuration", "error", err)
	}

	// Initialize database
	db, err := database.NewPostgresDB(cfg.Database)
	if err != nil {
		log.Fatal("Failed to connect to database", "error", err)
	}
	defer db.Close()

	// Initialize cache (Redis preferred; fallback to in-memory for local dev)
	var cacheClient cache.Client
	redisClient, err := cache.NewRedisClient(fmt.Sprintf("%s:%d", cfg.Redis.Host, cfg.Redis.Port), cfg.Redis.Password, cfg.Redis.DB)
	if err != nil {
		cacheClient = cache.NewInMemoryClient()
		log.Warnw("Redis not available, using in-memory cache", "error", err)
	} else {
		cacheClient = redisClient
	}

	// Initialize producer (Kafka preferred; fallback to noop for local dev)
	var producer queue.Producer
	kafkaProducer, err := queue.NewKafkaProducer(cfg.Kafka)
	if err != nil {
		producer = queue.NewNoopProducer()
		log.Warnw("Kafka not available, using noop producer", "error", err)
	} else {
		producer = kafkaProducer
		defer kafkaProducer.Close()
	}

	// Initialize repositories
	transactionRepo := repository.NewTransactionRepository(db)
	merchantRepo := repository.NewMerchantRepository(db)
	paymentRepo := repository.NewPaymentRepository(db)
	refundRepo := repository.NewRefundRepository(db)
	webhookRepo := repository.NewWebhookRepository(db)
	settlementRepo := repository.NewSettlementRepository(db)
	subscriptionRepo := repository.NewSubscriptionRepository(db)
	teamRepo := repository.NewTeamRepository(db)
	vaultRepo := repository.NewVaultRepository(db)
	reportingService := service.NewReportingService(db)

	routingService := service.NewRoutingService(cfg.MLServices.FraudURL, log)
	fraudService := service.NewFraudService(cfg.MLServices.FraudURL)
	vaultService := service.NewVaultService(vaultRepo, log)

	// Pulse Real-Time WebSocket Hub (Phase 11)
	pulseHub := ws.NewHub(log)
	go pulseHub.Run()

	// Initialize services
	webhookService := service.NewWebhookService(webhookRepo, log)
	settlementService := service.NewSettlementService(settlementRepo, transactionRepo, log)
	paymentService := service.NewPaymentService(
		paymentRepo,
		transactionRepo,
		refundRepo,
		producer,
		cacheClient,
		webhookService,
		fraudService,
		vaultService,
		pulseHub,
		log,
	)
	merchantService := service.NewMerchantService(merchantRepo, transactionRepo, teamRepo, log)
	authService := service.NewAuthService(merchantRepo, cacheClient, cfg.JWT, log)
	subscriptionService := service.NewSubscriptionService(subscriptionRepo, log)

	// Initialize repositories
	paymentLinkRepo := repository.NewPaymentLinkRepository(db)
	adminRepo := repository.NewAdminRepository(db)
	disputeRepo := repository.NewDisputeRepository(db)

	// Initialize handlers
	paymentHandler := handlers.NewPaymentHandler(paymentService, webhookService, paymentLinkRepo, log)
	merchantHandler := handlers.NewMerchantHandler(merchantService, reportingService, log)
	reportingHandler := handlers.NewReportingHandler(reportingService, log)
	authHandler := handlers.NewAuthHandler(authService, log)
	routingHandler := handlers.NewRoutingHandler(routingService)
	fraudHandler := handlers.NewFraudHandler(transactionRepo, fraudService)
	settlementHandler := handlers.NewSettlementHandler(settlementService, log)
	checkoutHandler := handlers.NewCheckoutHandler(cacheClient)
	publicRoutingHandler := handlers.NewPublicRoutingHandler(routingService, cacheClient)
	publicPaymentHandler := handlers.NewPublicPaymentHandler(paymentService, cacheClient)
	vaultHandler := handlers.NewVaultHandler(vaultService, log)
	websocketHandler := handlers.NewWebsocketHandler(pulseHub, log)
	
	adminService := service.NewAdminService(adminRepo, log)
	adminHandler := handlers.NewAdminHandler(adminService, cacheClient, log, cfg.JWT.Secret, cfg.Server.AdminEmail, cfg.Server.AdminPassword)
	subscriptionHandler := handlers.NewSubscriptionHandler(subscriptionService, log)
	disputeHandler := handlers.NewDisputeHandler(disputeRepo, log)

	// Background workers
	workerCtx, workerCancel := context.WithCancel(context.Background())
	defer workerCancel()

	var consumer queue.Consumer
	kafkaConsumer, err := queue.NewKafkaConsumer(cfg.Kafka, log)
	if err != nil {
		consumer = queue.NewNoopConsumer()
	} else {
		consumer = kafkaConsumer
		defer kafkaConsumer.Close()
	}

	settlementWorker := worker.NewSettlementWorker(settlementRepo, transactionRepo, log)
	go settlementWorker.Start(workerCtx)

	subscriptionWorker := worker.NewSubscriptionWorker(subscriptionRepo, paymentService, log)
	go subscriptionWorker.Start(workerCtx)

	go webhookService.ListenAndDispatch(workerCtx, consumer, cfg.Kafka.Topics.Transactions, "api-gateway-webhooks")
	go webhookService.RunDispatcher(workerCtx)

	// Setup Gin router
	if cfg.Server.Mode == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()

	// Recovery middleware to catch panics
	router.Use(gin.Recovery())

	// CORS middleware
	router.Use(func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		// Dynamically allow any origin reflecting the request
		if origin != "" {
			c.Header("Access-Control-Allow-Origin", origin)
		} else {
			c.Header("Access-Control-Allow-Origin", "*")
		}
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")
		c.Header("Access-Control-Allow-Credentials", "true")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	})

	// Global middleware
	router.Use(middleware.RequestLogger(log))
	router.Use(middleware.Recovery(log))
	router.Use(middleware.CORS())
	router.Use(middleware.RateLimiter(cacheClient))

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "healthy",
			"service": "payment-gateway-api",
			"version": "1.0.0",
		})
	})

	// Public endpoints (session-token protected where needed)
	public := router.Group("/public")
	{
		// Create checkout session requires merchant auth
		publicAuth := public.Group("")
		publicAuth.Use(middleware.JWTAuth(cfg.JWT.Secret, cacheClient))
		{
			publicAuth.POST("/checkout/session", checkoutHandler.CreateSession)
		}

		// Public routing requires checkout session token
		public.GET("/routing/decision", publicRoutingHandler.GetDecision)

		// Public payments require checkout session token
		public.POST("/payments", middleware.Idempotency(cacheClient), publicPaymentHandler.CreatePayment)
		public.GET("/payments/:id/status", publicPaymentHandler.GetPaymentStatus)
		public.POST("/payments/:id/confirm", publicPaymentHandler.ConfirmPayment)
	}

	// API v1 routes
	v1 := router.Group("/api/v1")
	{
		// Public routes
		public := v1.Group("/public")
		public.Use(middleware.RateLimit(cacheClient, 100, time.Minute, log)) // 100 req/min for public routes
		{
			public.GET("/payment-links/:id", paymentHandler.GetPaymentLink)
			public.POST("/payment-links/:id/pay", paymentHandler.ProcessPaymentLink)
			public.POST("/webhooks/npci", paymentHandler.ProcessNPCIWebhook)
			public.POST("/payments", publicPaymentHandler.CreatePayment)
			public.POST("/checkout/session", checkoutHandler.CreateSession)
			public.GET("/checkout/intent", publicPaymentHandler.GetCheckoutIntent)
			public.GET("/routing/decision", publicRoutingHandler.GetDecision)
			
			// Secret Key Authenticated Merchant API
			merchantApi := public.Group("")
			merchantApi.Use(middleware.APIKeyAuth(merchantRepo, log))
			{
				merchantApi.POST("/payments/initiate", publicPaymentHandler.InitiatePayment)
				merchantApi.POST("/vault/tokens", vaultHandler.TokenizeCard)
			}
		}

		auth := v1.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
			auth.POST("/refresh", authHandler.RefreshToken)
			auth.POST("/login/2fa", authHandler.Login2FA)
		}

		// Pulse WebSockets
		v1.GET("/ws/pulse", websocketHandler.Connect)

		// Admin routes
		admin := v1.Group("/admin")
		admin.Use(middleware.AdminAuth(cfg.JWT.Secret, cfg.Server.AdminEmail, cacheClient))
		{
			admin.GET("/metrics", adminHandler.GetSystemMetrics)
			admin.GET("/merchants", adminHandler.GetAllMerchants)
			admin.PUT("/merchants/:id/status", adminHandler.UpdateMerchantStatus)
			admin.GET("/disputes", adminHandler.GetAllDisputes)
			admin.PUT("/disputes/:id/resolve", adminHandler.ResolveDispute)
			admin.GET("/transactions", adminHandler.GetAllTransactions)
			admin.GET("/activity", adminHandler.GetRecentActivity)
			admin.GET("/settings", adminHandler.GetSettings)
			admin.PUT("/settings", adminHandler.UpdateSettings)
			admin.GET("/health", adminHandler.GetHealthStats)
			admin.GET("/webhooks/stats", adminHandler.GetWebhookStats)
			admin.GET("/risk-transactions", adminHandler.GetRiskTransactions)
			admin.GET("/fraud-alerts", fraudHandler.GetAdminFraudSweeps)
			admin.POST("/transactions/:id/refund", adminHandler.RefundTransaction)

			// Phase 5: Settlements & Routing
			admin.GET("/settlements", adminHandler.AdminGetAllSettlements)
			admin.POST("/settlements/:id/approve", adminHandler.AdminApproveSettlement)
			admin.GET("/routing/stats", adminHandler.GetRoutingStats)
		}

		// Public admin login (no JWT required)
		v1.POST("/admin/login", adminHandler.AdminLogin)

		// Protected routes (require authentication)
		authenticated := v1.Group("")
		authenticated.Use(middleware.JWTAuth(cfg.JWT.Secret, cacheClient))
		authenticated.Use(middleware.RateLimit(cacheClient, 1000, time.Minute, log)) // 1000 req/min for authenticated
		{
			// Auth protected routes
			authProtected := authenticated.Group("/auth")
			{
				authProtected.POST("/logout-all", authHandler.LogoutAll)
				authProtected.POST("/2fa/generate", authHandler.Generate2FA)
				authProtected.POST("/2fa/verify", authHandler.Verify2FA)
				authProtected.POST("/2fa/disable", authHandler.Disable2FA)
			}
			// Payment routes
			payments := authenticated.Group("/payments")
			{
				payments.POST("", middleware.Idempotency(cacheClient), paymentHandler.CreatePayment)
				payments.GET("/:id", paymentHandler.GetPayment)
				payments.POST("/:id/capture", middleware.RBAC("owner", "admin", "developer"), paymentHandler.CapturePayment)
				payments.POST("/:id/refund", middleware.RBAC("owner", "admin", "developer"), paymentHandler.RefundPayment)
			}

			// Transaction routes
			transactions := authenticated.Group("/transactions")
			{
				transactions.GET("", paymentHandler.ListTransactions)
				transactions.GET("/:id", paymentHandler.GetTransaction)
			}

			// Merchant routes
			merchants := authenticated.Group("/merchants")
			{
				merchants.GET("/me", merchantHandler.GetProfile)
				merchants.PUT("/me", merchantHandler.UpdateProfile)
				merchants.GET("/stats", merchantHandler.GetStats)

				// Team management
				merchants.GET("/me/team", merchantHandler.GetTeam)
				merchants.POST("/me/team", middleware.RBAC("owner", "admin"), merchantHandler.InviteTeamMember)
				merchants.DELETE("/me/team/:id", middleware.RBAC("owner", "admin"), merchantHandler.RemoveTeamMember)
			}

			// Customer routes
			authenticated.GET("/customers", merchantHandler.GetCustomers)

			// Banking routes
			authenticated.GET("/bank-accounts", merchantHandler.GetBankAccounts)
			authenticated.POST("/bank-accounts", merchantHandler.AddBankAccount)
			authenticated.GET("/balance", merchantHandler.GetBalance)
			authenticated.POST("/withdrawals", merchantHandler.RequestWithdrawal)
			authenticated.GET("/withdrawals", merchantHandler.GetWithdrawals)

			// Webhook routes
			webhooks := authenticated.Group("/webhooks")
			{
				webhooks.POST("", middleware.RBAC("owner", "admin", "developer"), paymentHandler.CreateWebhook)
				webhooks.GET("", paymentHandler.ListWebhooks)
				webhooks.DELETE("/:id", middleware.RBAC("owner", "admin", "developer"), paymentHandler.DeleteWebhook)
				webhooks.POST("/:id/test", middleware.RBAC("owner", "admin", "developer"), paymentHandler.TestWebhook)
			}

			// Payment Links routes
			paymentLinks := authenticated.Group("/payment-links")
			{
				paymentLinks.GET("", paymentHandler.ListPaymentLinks)
				paymentLinks.POST("", paymentHandler.CreatePaymentLink)
				paymentLinks.GET("/:id", paymentHandler.GetPaymentLink)
				paymentLinks.DELETE("/:id", paymentHandler.DeletePaymentLink)
			}

			// Subscriptions routes
			subs := authenticated.Group("/subscriptions")
			{
				subs.GET("", subscriptionHandler.ListSubscriptions)
				subs.POST("", subscriptionHandler.CreateSubscription)
				subs.DELETE("/:id", subscriptionHandler.CancelSubscription)
			}

			// Dispute routes
			disputes := authenticated.Group("/disputes")
			{
				disputes.GET("", disputeHandler.List)
				disputes.POST("", disputeHandler.Create)
				disputes.GET("/:id", disputeHandler.Get)
				disputes.POST("/:id/evidence", disputeHandler.SubmitEvidence)
			}
			plans := authenticated.Group("/plans")
			{
				plans.GET("", subscriptionHandler.ListPlans)
				plans.POST("", subscriptionHandler.CreatePlan)
			}

			// API Keys routes
			merchantApi := authenticated.Group("/api-keys")
			{
				merchantApi.POST("", middleware.RBAC("owner", "admin", "developer"), merchantHandler.CreateApiKey)
				merchantApi.GET("", merchantHandler.GetApiKeys)
				merchantApi.PUT("/:id", middleware.RBAC("owner", "admin", "developer"), merchantHandler.RegenerateApiKey)
				merchantApi.DELETE("/:id", middleware.RBAC("owner", "admin", "developer"), merchantHandler.RevokeApiKey)
			}

			authenticated.GET("/dashboard/overview", reportingHandler.DashboardOverview)
			authenticated.GET("/analytics", reportingHandler.Analytics)

			// Tier-1 feature routes
			authenticated.GET("/routing/decision", routingHandler.GetDecision)
			authenticated.GET("/fraud/score/:transactionId", fraudHandler.GetScore)
			authenticated.GET("/fraud/factors/:transactionId", fraudHandler.GetFactors)

			// Settlement routes
			settlements := authenticated.Group("/settlements")
			{
				settlements.GET("", settlementHandler.List)
				settlements.POST("/generate", settlementHandler.Generate)
			}
		}
	}

	// API alias routes (frontend compatibility): /api/* maps to /api/v1/*
	api := router.Group("/api")
	{
		// Public routes
		publicApi := api.Group("/public")
		{
			publicApi.GET("/payment-links/:id", paymentHandler.GetPaymentLink)
			publicApi.POST("/payment-links/:id/pay", paymentHandler.ProcessPaymentLink)
		}

		auth := api.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/signup", authHandler.Register)
			auth.POST("/login", authHandler.Login)
			auth.POST("/refresh", authHandler.RefreshToken)
			auth.POST("/login/2fa", authHandler.Login2FA)
		}

		// Protected routes
		authenticated := api.Group("")
		authenticated.Use(middleware.JWTAuth(cfg.JWT.Secret, cacheClient))
		{
			// Auth protected routes
			authProtected := authenticated.Group("/auth")
			{
				authProtected.POST("/logout-all", authHandler.LogoutAll)
				authProtected.POST("/2fa/generate", authHandler.Generate2FA)
				authProtected.POST("/2fa/verify", authHandler.Verify2FA)
				authProtected.POST("/2fa/disable", authHandler.Disable2FA)
			}
			authenticated.POST("/payments", middleware.Idempotency(cacheClient), paymentHandler.CreatePayment)
			authenticated.GET("/payments/:id", paymentHandler.GetPayment)
			authenticated.POST("/payments/:id/capture", middleware.RBAC("owner", "admin", "developer"), paymentHandler.CapturePayment)
			authenticated.POST("/payments/:id/refund", middleware.RBAC("owner", "admin", "developer"), paymentHandler.RefundPayment)

			authenticated.GET("/transactions", paymentHandler.ListTransactions)
			authenticated.GET("/transactions/:id", paymentHandler.GetTransaction)

			authenticated.GET("/merchants/me", merchantHandler.GetProfile)
			authenticated.PUT("/merchants/me", merchantHandler.UpdateProfile)
			authenticated.GET("/merchants/stats", merchantHandler.GetStats)
			authenticated.GET("/customers", merchantHandler.GetCustomers)

			// Team management
			authenticated.GET("/merchants/me/team", merchantHandler.GetTeam)
			authenticated.POST("/merchants/me/team", middleware.RBAC("owner", "admin"), merchantHandler.InviteTeamMember)
			authenticated.DELETE("/merchants/me/team/:id", middleware.RBAC("owner", "admin"), merchantHandler.RemoveTeamMember)

			authenticated.POST("/webhooks", middleware.RBAC("owner", "admin", "developer"), paymentHandler.CreateWebhook)
			authenticated.GET("/webhooks", paymentHandler.ListWebhooks)
			authenticated.DELETE("/webhooks/:id", middleware.RBAC("owner", "admin", "developer"), paymentHandler.DeleteWebhook)

			authenticated.GET("/dashboard/overview", reportingHandler.DashboardOverview)
			authenticated.GET("/analytics", reportingHandler.Analytics)

			// Tier-1 feature routes
			authenticated.GET("/routing/decision", routingHandler.GetDecision)
			authenticated.GET("/fraud/score/:transactionId", fraudHandler.GetScore)
			authenticated.GET("/fraud/factors/:transactionId", fraudHandler.GetFactors)

			// Payment Links routes
			paymentLinks := authenticated.Group("/payment-links")
			{
				paymentLinks.GET("", paymentHandler.ListPaymentLinks)
				paymentLinks.POST("", paymentHandler.CreatePaymentLink)
				paymentLinks.GET("/:id", paymentHandler.GetPaymentLink)
				paymentLinks.DELETE("/:id", paymentHandler.DeletePaymentLink)
			}

			// Settlement routes
			settlements := authenticated.Group("/settlements")
			{
				settlements.GET("", settlementHandler.List)
				settlements.POST("/generate", settlementHandler.Generate)
			}
		}
	}

	// Start HTTP server
	srv := &http.Server{
		Addr:         fmt.Sprintf(":%d", cfg.Server.Port),
		Handler:      router,
		ReadTimeout:  cfg.Server.ReadTimeout,
		WriteTimeout: cfg.Server.WriteTimeout,
		IdleTimeout:  cfg.Server.IdleTimeout,
	}

	// Start Webhook Delivery Engine
	webhookEngine := worker.NewWebhookWorker(db, log)
	webhookEngine.Start()
	defer webhookEngine.Stop()

	// Start server
	go func() {
		log.Info("Starting server", "port", cfg.Server.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal("Failed to start server", "error", err)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info("Shutting down server...")
	workerCancel()

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal("Server forced to shutdown", "error", err)
	}

	log.Info("Server exited")
}
