-- Subscription Plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchants(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    interval_type VARCHAR(20) NOT NULL, -- e.g., 'daily', 'weekly', 'monthly', 'yearly'
    interval_count INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sub_plans_merchant ON subscription_plans(merchant_id);

-- Subscriptions table (Hooked to the Plan)
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchants(id),
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20),
    status VARCHAR(20) NOT NULL DEFAULT 'incomplete', -- 'active', 'past_due', 'canceled', 'incomplete'
    current_period_start TIMESTAMP NOT NULL,
    current_period_end TIMESTAMP NOT NULL,
    next_billing_date TIMESTAMP,
    canceled_at TIMESTAMP,
    upi_mandate_id VARCHAR(255), -- Support for UPI AutoPay RBI mandates
    card_mandate_id VARCHAR(255), -- Support for Card Standing Instructions
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_subs_merchant ON subscriptions(merchant_id);
CREATE INDEX idx_subs_status ON subscriptions(status);
CREATE INDEX idx_subs_billing_date ON subscriptions(next_billing_date);
