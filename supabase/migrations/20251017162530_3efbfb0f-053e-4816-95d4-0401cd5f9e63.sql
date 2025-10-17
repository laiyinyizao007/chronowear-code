-- Add style preference and geo location fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS style_preference TEXT,
ADD COLUMN IF NOT EXISTS geo_location TEXT;

-- Add comment to explain the new columns
COMMENT ON COLUMN public.profiles.style_preference IS 'User clothing style preferences (e.g., casual, formal, street, minimalist)';
COMMENT ON COLUMN public.profiles.geo_location IS 'User preferred location for weather and trend data';