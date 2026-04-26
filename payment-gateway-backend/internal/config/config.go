package config

import (
	"os"
	"time"

	"github.com/joho/godotenv"
	"github.com/spf13/viper"
)

// Config holds all application configuration
type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	Redis    RedisConfig
	Kafka    KafkaConfig
	JWT      JWTConfig
	Payment  PaymentConfig
	MLServices MLServicesConfig
	SMTP     SMTPConfig
}

type SMTPConfig struct {
	Host     string
	Port     int
	User     string
	Password string
}

type MLServicesConfig struct {
	FraudURL string
}

type ServerConfig struct {
	Port          int
	Mode          string
	AdminEmail    string
	AdminPassword string
	ReadTimeout   time.Duration
	WriteTimeout  time.Duration
	IdleTimeout   time.Duration
}

// DatabaseConfig holds PostgreSQL configuration
type DatabaseConfig struct {
	Host            string
	Port            int
	User            string
	Password        string
	DBName          string
	SSLMode         string
	MaxOpenConns    int
	MaxIdleConns    int
	ConnMaxLifetime time.Duration
}

// RedisConfig holds Redis configuration
type RedisConfig struct {
	Host     string
	Port     int
	Password string
	DB       int
	PoolSize int
}

// KafkaConfig holds Kafka configuration
type KafkaConfig struct {
	Brokers []string
	Topics  KafkaTopics
}

// KafkaTopics defines all Kafka topics
type KafkaTopics struct {
	Transactions string
	Webhooks     string
	Fraud        string
	Settlements  string
}

// JWTConfig holds JWT authentication configuration
type JWTConfig struct {
	Secret          string
	AccessTokenTTL  time.Duration
	RefreshTokenTTL time.Duration
}

// PaymentConfig holds payment gateway configuration
type PaymentConfig struct {
	Providers       []string
	DefaultProvider string
	Timeout         time.Duration
	MaxRetries      int
}

// LoadConfig loads configuration from environment variables and config files
func LoadConfig() (*Config, error) {
	// Load local .env file if present (optional)
	// This is for local development convenience; environment variables still take precedence.
	if _, err := os.Stat(".env"); err == nil {
		_ = godotenv.Overload(".env")
	}

	viper.SetConfigName("config")
	viper.SetConfigType("yaml")
	viper.AddConfigPath("./config")
	viper.AddConfigPath(".")

	// Set defaults
	setDefaults()

	// Auto bind environment variables
	viper.AutomaticEnv()

	// Read config file (optional)
	if err := viper.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return nil, err
		}
	}

	cfg := &Config{
		Server: ServerConfig{
			Port:          viper.GetInt("SERVER_PORT"),
			Mode:          viper.GetString("SERVER_MODE"),
			AdminEmail:    viper.GetString("ADMIN_EMAIL"),
			AdminPassword: viper.GetString("ADMIN_PASSWORD"),
			ReadTimeout:   viper.GetDuration("SERVER_READ_TIMEOUT"),
			WriteTimeout:  viper.GetDuration("SERVER_WRITE_TIMEOUT"),
			IdleTimeout:   viper.GetDuration("SERVER_IDLE_TIMEOUT"),
		},
		Database: DatabaseConfig{
			Host:            viper.GetString("DB_HOST"),
			Port:            viper.GetInt("DB_PORT"),
			User:            viper.GetString("DB_USER"),
			Password:        viper.GetString("DB_PASSWORD"),
			DBName:          viper.GetString("DB_NAME"),
			SSLMode:         viper.GetString("DB_SSLMODE"),
			MaxOpenConns:    viper.GetInt("DB_MAX_OPEN_CONNS"),
			MaxIdleConns:    viper.GetInt("DB_MAX_IDLE_CONNS"),
			ConnMaxLifetime: viper.GetDuration("DB_CONN_MAX_LIFETIME"),
		},
		Redis: RedisConfig{
			Host:     viper.GetString("REDIS_HOST"),
			Port:     viper.GetInt("REDIS_PORT"),
			Password: viper.GetString("REDIS_PASSWORD"),
			DB:       viper.GetInt("REDIS_DB"),
			PoolSize: viper.GetInt("REDIS_POOL_SIZE"),
		},
		Kafka: KafkaConfig{
			Brokers: viper.GetStringSlice("KAFKA_BROKERS"),
			Topics: KafkaTopics{
				Transactions: viper.GetString("KAFKA_TOPIC_TRANSACTIONS"),
				Webhooks:     viper.GetString("KAFKA_TOPIC_WEBHOOKS"),
				Fraud:        viper.GetString("KAFKA_TOPIC_FRAUD"),
				Settlements:  viper.GetString("KAFKA_TOPIC_SETTLEMENTS"),
			},
		},
		JWT: JWTConfig{
			Secret:          viper.GetString("JWT_SECRET"),
			AccessTokenTTL:  viper.GetDuration("JWT_ACCESS_TOKEN_TTL"),
			RefreshTokenTTL: viper.GetDuration("JWT_REFRESH_TOKEN_TTL"),
		},
		Payment: PaymentConfig{
			Providers:       viper.GetStringSlice("PAYMENT_PROVIDERS"),
			DefaultProvider: viper.GetString("PAYMENT_DEFAULT_PROVIDER"),
			Timeout:         viper.GetDuration("PAYMENT_TIMEOUT"),
			MaxRetries:      viper.GetInt("PAYMENT_MAX_RETRIES"),
		},
		MLServices: MLServicesConfig{
			FraudURL: viper.GetString("ML_SERVICES_FRAUD_URL"),
		},
		SMTP: SMTPConfig{
			Host:     viper.GetString("SMTP_HOST"),
			Port:     viper.GetInt("SMTP_PORT"),
			User:     viper.GetString("SMTP_USER"),
			Password: viper.GetString("SMTP_PASSWORD"),
		},
	}

	return cfg, nil
}

func setDefaults() {
	// Server defaults
	viper.SetDefault("SERVER_PORT", 8080)
	viper.SetDefault("SERVER_MODE", "debug")
	viper.SetDefault("ADMIN_EMAIL", "admin@paymentgateway.com")
	viper.SetDefault("SERVER_READ_TIMEOUT", 10*time.Second)
	viper.SetDefault("SERVER_WRITE_TIMEOUT", 10*time.Second)
	viper.SetDefault("SERVER_IDLE_TIMEOUT", 120*time.Second)

	// Database defaults
	viper.SetDefault("DB_HOST", "localhost")
	viper.SetDefault("DB_PORT", 5432)
	viper.SetDefault("DB_USER", "postgres")
	viper.SetDefault("DB_PASSWORD", "postgres")
	viper.SetDefault("DB_NAME", "payment_gateway")
	viper.SetDefault("DB_SSLMODE", "disable")
	viper.SetDefault("DB_MAX_OPEN_CONNS", 25)
	viper.SetDefault("DB_MAX_IDLE_CONNS", 5)
	viper.SetDefault("DB_CONN_MAX_LIFETIME", 5*time.Minute)

	// Redis defaults
	viper.SetDefault("REDIS_HOST", "localhost")
	viper.SetDefault("REDIS_PORT", 6379)
	viper.SetDefault("REDIS_PASSWORD", "")
	viper.SetDefault("REDIS_DB", 0)
	viper.SetDefault("REDIS_POOL_SIZE", 10)

	// Kafka defaults
	viper.SetDefault("KAFKA_BROKERS", []string{"localhost:9092"})
	viper.SetDefault("KAFKA_TOPIC_TRANSACTIONS", "transactions")
	viper.SetDefault("KAFKA_TOPIC_WEBHOOKS", "webhooks")
	viper.SetDefault("KAFKA_TOPIC_FRAUD", "fraud-alerts")
	viper.SetDefault("KAFKA_TOPIC_SETTLEMENTS", "settlements")

	// JWT defaults
	viper.SetDefault("JWT_SECRET", "your-secret-key-change-in-production")
	viper.SetDefault("JWT_ACCESS_TOKEN_TTL", 15*time.Minute)
	viper.SetDefault("JWT_REFRESH_TOKEN_TTL", 7*24*time.Hour)

	// Payment defaults
	viper.SetDefault("PAYMENT_PROVIDERS", []string{"stripe", "razorpay"})
	viper.SetDefault("PAYMENT_DEFAULT_PROVIDER", "razorpay")
	viper.SetDefault("PAYMENT_TIMEOUT", 30*time.Second)
	viper.SetDefault("PAYMENT_MAX_RETRIES", 3)

	// ML defaults
	viper.SetDefault("ML_SERVICES_FRAUD_URL", "http://localhost:8000")

	// SMTP defaults
	viper.SetDefault("SMTP_HOST", "smtp.gmail.com")
	viper.SetDefault("SMTP_PORT", 587)
	viper.SetDefault("SMTP_USER", "")
	viper.SetDefault("SMTP_PASSWORD", "")
}
