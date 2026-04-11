-- Disputes (Chargebacks) table
CREATE TABLE IF NOT EXISTS disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchants(id),
    transaction_id UUID NOT NULL REFERENCES transactions(id),
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    reason VARCHAR(100) NOT NULL,          -- e.g. 'fraudulent', 'product_not_received', 'duplicate'
    status VARCHAR(30) DEFAULT 'open',     -- open | under_review | won | lost | closed
    description TEXT,
    evidence TEXT,                         -- merchant's submitted evidence
    due_by TIMESTAMP,                      -- deadline to respond
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_disputes_merchant ON disputes(merchant_id, created_at DESC);
CREATE INDEX idx_disputes_transaction ON disputes(transaction_id);
CREATE INDEX idx_disputes_status ON disputes(status);
