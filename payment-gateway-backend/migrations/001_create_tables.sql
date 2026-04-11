-- Merchants table
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS merchants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    api_key_hash VARCHAR(255) NOT NULL,
    api_secret_hash VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    kyc_status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Transactions table (partitioned by date)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchants(id),
    order_id VARCHAR(255) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    status VARCHAR(20) NOT NULL,
    payment_method VARCHAR(50),
    payment_provider VARCHAR(50),
    customer_email VARCHAR(255),
    customer_phone VARCHAR(20),
    customer_ip VARCHAR(45),
    device_fingerprint VARCHAR(255),
    fraud_score INTEGER,
    routing_decision JSONB,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

CREATE INDEX idx_transactions_merchant ON transactions(merchant_id, created_at DESC);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_order ON transactions(order_id);

-- Payment details table
CREATE TABLE IF NOT EXISTS payment_details (
    transaction_id UUID PRIMARY KEY REFERENCES transactions(id),
    token VARCHAR(255),
    card_last4 VARCHAR(4),
    card_brand VARCHAR(20),
    card_type VARCHAR(20),
    upi_vpa VARCHAR(255),
    bank_code VARCHAR(20),
    encrypted_data TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Refunds table
CREATE TABLE IF NOT EXISTS refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id),
    amount DECIMAL(15,2) NOT NULL,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Webhooks table
CREATE TABLE IF NOT EXISTS webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchants(id),
    url VARCHAR(500) NOT NULL,
    secret VARCHAR(255) NOT NULL,
    events TEXT[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Webhook events table
CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchants(id),
    event_type VARCHAR(50) NOT NULL,
    transaction_id UUID REFERENCES transactions(id),
    payload JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    attempts INTEGER DEFAULT 0,
    last_attempt TIMESTAMP,
    next_retry TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Settlements table
CREATE TABLE IF NOT EXISTS settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchants(id),
    settlement_date DATE NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    total_transactions INTEGER NOT NULL,
    fees DECIMAL(15,2) NOT NULL,
    tax DECIMAL(15,2) NOT NULL,
    net_amount DECIMAL(15,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    utr_number VARCHAR(50),
    settled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Fraud events table
CREATE TABLE IF NOT EXISTS fraud_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id),
    fraud_score INTEGER NOT NULL,
    risk_factors JSONB,
    action_taken VARCHAR(50),
    ml_model_version VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW()
);
