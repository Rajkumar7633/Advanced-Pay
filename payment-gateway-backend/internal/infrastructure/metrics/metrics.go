package metrics

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	// HTTP request metrics
	httpRequestsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "http_requests_total",
			Help: "Total number of HTTP requests",
		},
		[]string{"method", "endpoint", "status"},
	)

	httpRequestDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "http_request_duration_seconds",
			Help:    "HTTP request latency in seconds",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"method", "endpoint"},
	)

	// Payment metrics
	paymentsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "payments_total",
			Help: "Total number of payment transactions",
		},
		[]string{"status", "provider", "method"},
	)

	paymentAmount = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "payment_amount",
			Help:    "Payment transaction amounts",
			Buckets: []float64{10, 50, 100, 500, 1000, 5000, 10000, 50000},
		},
		[]string{"currency", "provider"},
	)

	paymentDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "payment_duration_seconds",
			Help:    "Payment processing duration in seconds",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"provider", "method"},
	)

	// Database metrics
	dbConnectionsActive = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "db_connections_active",
			Help: "Number of active database connections",
		},
	)

	dbConnectionsIdle = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "db_connections_idle",
			Help: "Number of idle database connections",
		},
	)

	dbQueryDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "db_query_duration_seconds",
			Help:    "Database query duration in seconds",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"operation", "table"},
	)

	// Cache metrics
	cacheHitsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "cache_hits_total",
			Help: "Total number of cache hits",
		},
		[]string{"cache_type"},
	)

	cacheMissesTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "cache_misses_total",
			Help: "Total number of cache misses",
		},
		[]string{"cache_type"},
	)

	// Circuit breaker metrics
	circuitBreakerState = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "circuit_breaker_state",
			Help: "Circuit breaker state (0=closed, 1=open, 2=half-open)",
		},
		[]string{"service"},
	)

	circuitBreakerFailures = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "circuit_breaker_failures_total",
			Help: "Total number of circuit breaker failures",
		},
		[]string{"service"},
	)

	// Queue metrics
	queueMessagesTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "queue_messages_total",
			Help: "Total number of queue messages",
		},
		[]string{"topic", "status"},
	)

	queueLag = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "queue_lag_seconds",
			Help: "Queue consumer lag in seconds",
		},
		[]string{"topic", "consumer_group"},
	)

	// Fraud detection metrics
	fraudScore = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "fraud_score",
			Help:    "Fraud detection scores",
			Buckets: []float64{0, 10, 25, 50, 75, 85, 95, 100},
		},
		[]string{"model"},
	)

	fraudBlockedTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "fraud_blocked_total",
			Help: "Total number of transactions blocked by fraud detection",
		},
		[]string{"reason"},
	)

	// Webhook metrics
	webhookDeliveriesTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "webhook_deliveries_total",
			Help: "Total number of webhook deliveries",
		},
		[]string{"status"},
	)

	webhookDeliveryDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "webhook_delivery_duration_seconds",
			Help:    "Webhook delivery duration in seconds",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"status"},
	)

	// System metrics
	systemMemoryUsage = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "system_memory_usage_bytes",
			Help: "System memory usage in bytes",
		},
	)

	systemGoroutines = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "system_goroutines",
			Help: "Number of running goroutines",
		},
	)
)

// HTTP Metrics
func RecordHTTPRequest(method, endpoint, status string, duration float64) {
	httpRequestsTotal.WithLabelValues(method, endpoint, status).Inc()
	httpRequestDuration.WithLabelValues(method, endpoint).Observe(duration)
}

// Payment Metrics
func RecordPayment(status, provider, method string, amount float64, currency string, duration float64) {
	paymentsTotal.WithLabelValues(status, provider, method).Inc()
	paymentAmount.WithLabelValues(currency, provider).Observe(amount)
	paymentDuration.WithLabelValues(provider, method).Observe(duration)
}

// Database Metrics
func RecordDBConnections(active, idle int) {
	dbConnectionsActive.Set(float64(active))
	dbConnectionsIdle.Set(float64(idle))
}

func RecordDBQuery(operation, table string, duration float64) {
	dbQueryDuration.WithLabelValues(operation, table).Observe(duration)
}

// Cache Metrics
func RecordCacheHit(cacheType string) {
	cacheHitsTotal.WithLabelValues(cacheType).Inc()
}

func RecordCacheMiss(cacheType string) {
	cacheMissesTotal.WithLabelValues(cacheType).Inc()
}

// Circuit Breaker Metrics
func RecordCircuitBreakerState(service string, state int) {
	circuitBreakerState.WithLabelValues(service).Set(float64(state))
}

func RecordCircuitBreakerFailure(service string) {
	circuitBreakerFailures.WithLabelValues(service).Inc()
}

// Queue Metrics
func RecordQueueMessage(topic, status string) {
	queueMessagesTotal.WithLabelValues(topic, status).Inc()
}

func RecordQueueLag(topic, consumerGroup string, lag float64) {
	queueLag.WithLabelValues(topic, consumerGroup).Set(lag)
}

// Fraud Metrics
func RecordFraudScore(model string, score float64) {
	fraudScore.WithLabelValues(model).Observe(score)
}

func RecordFraudBlocked(reason string) {
	fraudBlockedTotal.WithLabelValues(reason).Inc()
}

// Webhook Metrics
func RecordWebhookDelivery(status string, duration float64) {
	webhookDeliveriesTotal.WithLabelValues(status).Inc()
	webhookDeliveryDuration.WithLabelValues(status).Observe(duration)
}

// System Metrics
func RecordSystemMetrics(memoryUsage uint64, goroutines int) {
	systemMemoryUsage.Set(float64(memoryUsage))
	systemGoroutines.Set(float64(goroutines))
}
