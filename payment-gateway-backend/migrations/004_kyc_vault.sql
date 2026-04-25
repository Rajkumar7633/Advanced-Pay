-- 004_kyc_vault.sql
-- Add a highly secure JSONB column to the merchants table to natively and safely hold sensitive KYC artifacts without external buckets.

ALTER TABLE merchants
ADD COLUMN IF NOT EXISTS kyc_documents JSONB DEFAULT '{}'::jsonb;
