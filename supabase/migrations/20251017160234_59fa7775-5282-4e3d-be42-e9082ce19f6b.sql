-- Fix search_path for update_garment_usage_count function
CREATE OR REPLACE FUNCTION update_garment_usage_count()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;