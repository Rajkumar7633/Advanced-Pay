package database

import (
	"fmt"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
	"github.com/yourcompany/payment-gateway/internal/config"
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

	// Enforce Enterprise-Level High Throughput Connection defaults
	maxOpen := cfg.MaxOpenConns
	if maxOpen < 100 {
		maxOpen = 500 // Engine needs massive parallelism (500 open conns)
	}
	db.SetMaxOpenConns(maxOpen)

	maxIdle := cfg.MaxIdleConns
	if maxIdle < 25 {
		maxIdle = 100 // Maintain large hot pool for burst traffic latency
	}
	db.SetMaxIdleConns(maxIdle)

	// Ensure connections recycle safely to prevent driver memory leaks
	db.SetConnMaxLifetime(cfg.ConnMaxLifetime)

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return db, nil
}
