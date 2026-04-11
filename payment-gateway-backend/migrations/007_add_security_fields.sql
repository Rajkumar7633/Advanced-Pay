-- Migration 007: Add Security Fields

BEGIN;

ALTER TABLE merchants
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(255),
ADD COLUMN IF NOT EXISTS token_version INT DEFAULT 1;

COMMIT;
