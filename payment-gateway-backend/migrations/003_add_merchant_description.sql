-- Add description column to merchants table
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS description TEXT;
