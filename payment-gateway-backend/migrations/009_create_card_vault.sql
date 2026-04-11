-- Card Vault Table
CREATE TABLE IF NOT EXISTS card_vault (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchants(id),
    customer_email VARCHAR(255) NOT NULL,
    token_id VARCHAR(100) UNIQUE NOT NULL,
    card_last4 VARCHAR(4) NOT NULL,
    card_brand VARCHAR(50) NOT NULL,
    expiry_month VARCHAR(2) NOT NULL,
    expiry_year VARCHAR(4) NOT NULL,
    encrypted_payload TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_card_vault_merchant ON card_vault(merchant_id);
CREATE INDEX idx_card_vault_email ON card_vault(customer_email);
CREATE INDEX idx_card_vault_token ON card_vault(token_id);
