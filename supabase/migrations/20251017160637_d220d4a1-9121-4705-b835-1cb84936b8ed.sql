-- Add care_instructions column to garments table
ALTER TABLE garments 
ADD COLUMN IF NOT EXISTS care_instructions TEXT DEFAULT NULL;

COMMENT ON COLUMN garments.care_instructions IS 'AI-generated care instructions based on material and garment type';