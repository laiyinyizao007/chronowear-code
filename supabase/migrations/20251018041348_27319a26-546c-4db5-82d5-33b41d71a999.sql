-- Add usage_count column to saved_outfits table
ALTER TABLE public.saved_outfits 
ADD COLUMN IF NOT EXISTS usage_count INTEGER NOT NULL DEFAULT 0;

-- Add saved_outfit_id column to ootd_records to track which outfit was used
ALTER TABLE public.ootd_records
ADD COLUMN IF NOT EXISTS saved_outfit_id UUID REFERENCES public.saved_outfits(id) ON DELETE SET NULL;

-- Create function to update outfit usage count
CREATE OR REPLACE FUNCTION public.update_outfit_usage_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- When inserting a new OOTD record with a saved outfit
  IF TG_OP = 'INSERT' AND NEW.saved_outfit_id IS NOT NULL THEN
    UPDATE saved_outfits
    SET usage_count = usage_count + 1
    WHERE id = NEW.saved_outfit_id;
  END IF;
  
  -- When updating OOTD record and changing the outfit
  IF TG_OP = 'UPDATE' THEN
    -- Decrement count for old outfit
    IF OLD.saved_outfit_id IS NOT NULL AND (NEW.saved_outfit_id IS NULL OR NEW.saved_outfit_id != OLD.saved_outfit_id) THEN
      UPDATE saved_outfits
      SET usage_count = GREATEST(usage_count - 1, 0)
      WHERE id = OLD.saved_outfit_id;
    END IF;
    
    -- Increment count for new outfit
    IF NEW.saved_outfit_id IS NOT NULL AND (OLD.saved_outfit_id IS NULL OR NEW.saved_outfit_id != OLD.saved_outfit_id) THEN
      UPDATE saved_outfits
      SET usage_count = usage_count + 1
      WHERE id = NEW.saved_outfit_id;
    END IF;
  END IF;
  
  -- When deleting OOTD record
  IF TG_OP = 'DELETE' AND OLD.saved_outfit_id IS NOT NULL THEN
    UPDATE saved_outfits
    SET usage_count = GREATEST(usage_count - 1, 0)
    WHERE id = OLD.saved_outfit_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger to automatically update outfit usage count
DROP TRIGGER IF EXISTS update_outfit_usage_count_trigger ON public.ootd_records;
CREATE TRIGGER update_outfit_usage_count_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.ootd_records
FOR EACH ROW
EXECUTE FUNCTION public.update_outfit_usage_count();