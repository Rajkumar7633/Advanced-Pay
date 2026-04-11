-- Add multi-currency base tracking fields to existing transactions mapping tables.

ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS base_amount DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(10,4);

-- Update existing records to assume INR base equivalence dynamically
UPDATE transactions
SET base_amount = amount, exchange_rate = 1.0000
WHERE base_amount IS NULL;
