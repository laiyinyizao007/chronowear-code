-- Add usage_rate and washing_frequency columns to garments table
ALTER TABLE garments 
ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS washing_frequency TEXT DEFAULT NULL;

COMMENT ON COLUMN garments.usage_count IS 'Number of times this garment has been worn (tracked via ootd_records)';
COMMENT ON COLUMN garments.washing_frequency IS 'Recommended washing frequency based on material (e.g., "After each wear", "After 2-3 wears", "Weekly", "Bi-weekly")';

-- Create function to update garment usage count
CREATE OR REPLACE FUNCTION update_garment_usage_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update usage count for all garments in the new OOTD record
  IF TG_OP = 'INSERT' THEN
    UPDATE garments
    SET usage_count = usage_count + 1
    WHERE id = ANY(NEW.garment_ids);
  END IF;
  
  -- If garments are removed from an OOTD record, decrement usage count
  IF TG_OP = 'UPDATE' THEN
    -- Decrement for removed garments
    UPDATE garments
    SET usage_count = GREATEST(usage_count - 1, 0)
    WHERE id = ANY(
      SELECT unnest(OLD.garment_ids)
      EXCEPT
      SELECT unnest(NEW.garment_ids)
    );
    
    -- Increment for newly added garments
    UPDATE garments
    SET usage_count = usage_count + 1
    WHERE id = ANY(
      SELECT unnest(NEW.garment_ids)
      EXCEPT
      SELECT unnest(OLD.garment_ids)
    );
  END IF;
  
  -- If OOTD record is deleted, decrement usage count
  IF TG_OP = 'DELETE' THEN
    UPDATE garments
    SET usage_count = GREATEST(usage_count - 1, 0)
    WHERE id = ANY(OLD.garment_ids);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update usage count
DROP TRIGGER IF EXISTS trigger_update_garment_usage_count ON ootd_records;
CREATE TRIGGER trigger_update_garment_usage_count
AFTER INSERT OR UPDATE OR DELETE ON ootd_records
FOR EACH ROW
EXECUTE FUNCTION update_garment_usage_count();