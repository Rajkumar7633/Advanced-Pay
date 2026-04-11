-- Add password_hash to merchants for persisted login credentials
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE merchants
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Backfill placeholder for any existing rows without password_hash.
-- NOTE: These accounts will still require password reset or cache-based legacy flow.
UPDATE merchants SET password_hash = '' WHERE password_hash IS NULL;
