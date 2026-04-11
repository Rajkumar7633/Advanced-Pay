-- Migration 005: Add JSONB settings column to merchants

BEGIN;

ALTER TABLE merchants
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

COMMIT;
