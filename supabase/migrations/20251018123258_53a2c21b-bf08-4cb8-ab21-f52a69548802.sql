-- Add notes and currency fields to garments table
ALTER TABLE garments 
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD';