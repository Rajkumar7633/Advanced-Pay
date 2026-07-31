package database

import (
	"fmt"
	"time"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
	"github.com/yourcompany/payment-gateway/internal/config"
	"github.com/yourcompany/payment-gateway/internal/infrastructure/metrics"
)

func NewPostgresDB(cfg config.DatabaseConfig) (*sqlx.DB, error) {
	dsn := fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		cfg.Host, cfg.Port, cfg.User, cfg.Password, cfg.DBName, cfg.SSLMode,
	)

	db, err := sqlx.Connect("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Enterprise-Level High Throughput Connection Pooling for 10,000+ TPS
	maxOpen := cfg.MaxOpenConns
	if maxOpen < 100 {
		maxOpen = 2000 // Support 10k TPS with proper connection pooling
	}
	db.SetMaxOpenConns(maxOpen)

	maxIdle := cfg.MaxIdleConns
	if maxIdle < 25 {
		maxIdle = 500 // Maintain large hot pool for burst traffic latency
	}
	db.SetMaxIdleConns(maxIdle)

	// Connection lifecycle management for high throughput
	maxLifetime := cfg.ConnMaxLifetime
	if maxLifetime < 5*time.Minute {
		maxLifetime = 30 * time.Minute // Balance between connection reuse and freshness
	}
	db.SetConnMaxLifetime(maxLifetime)

	// Set connection idle timeout to prevent stale connections
	db.SetConnMaxIdleTime(10 * time.Minute)

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	// Start background metrics collection
	go collectDBMetrics(db)

	return db, nil
}

// collectDBMetrics periodically collects database connection pool metrics
func collectDBMetrics(db *sqlx.DB) {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		stats := db.Stats()
		metrics.RecordDBConnections(stats.OpenConnections, stats.Idle)
	}
}
