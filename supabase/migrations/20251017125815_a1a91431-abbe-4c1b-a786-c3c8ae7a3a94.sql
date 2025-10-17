-- Add products column to ootd_records table to store identified product information
ALTER TABLE ootd_records ADD COLUMN IF NOT EXISTS products JSONB DEFAULT '[]'::jsonb;