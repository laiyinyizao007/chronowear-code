-- Add official_price and acquired_date columns to garments table
ALTER TABLE garments 
ADD COLUMN IF NOT EXISTS official_price DECIMAL(10,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS acquired_date DATE DEFAULT CURRENT_DATE;

COMMENT ON COLUMN garments.official_price IS 'Official retail price of the garment';
COMMENT ON COLUMN garments.acquired_date IS 'Date when the garment was acquired, defaults to creation date but can be modified';