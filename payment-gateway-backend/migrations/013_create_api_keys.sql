-- Migration 013: Create API Keys Table

BEGIN;

CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    environment VARCHAR(20) NOT NULL,
    publishable_key VARCHAR(255) NOT NULL,
    secret_key_id VARCHAR(100) NOT NULL,
    secret_key_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (merchant_id, environment)
);

COMMIT;
