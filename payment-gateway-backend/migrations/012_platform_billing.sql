-- Platform Billing for Merchants

CREATE TABLE IF NOT EXISTS merchant_billing_profiles (
    merchant_id UUID PRIMARY KEY REFERENCES merchants(id) ON DELETE CASCADE,
    plan_name VARCHAR(255) NOT NULL,
    fee_percentage DECIMAL(5,2) NOT NULL DEFAULT 1.50,
    fixed_fee DECIMAL(10,2) NOT NULL DEFAULT 2.00,
    next_billing_date TIMESTAMP,
    platform_card_brand VARCHAR(50),
    platform_card_last4 VARCHAR(4),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS platform_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'paid', 'failed'
    due_date TIMESTAMP NOT NULL,
    pdf_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW(),
    paid_at TIMESTAMP
);

CREATE INDEX idx_platform_invoices_merchant ON platform_invoices(merchant_id);
