-- Add liked column to saved_outfits table
ALTER TABLE saved_outfits ADD COLUMN IF NOT EXISTS liked boolean DEFAULT false;

-- Add liked column to garments table
ALTER TABLE garments ADD COLUMN IF NOT EXISTS liked boolean DEFAULT false;

-- Create index for faster queries on liked items
CREATE INDEX IF NOT EXISTS idx_saved_outfits_liked ON saved_outfits(user_id, liked);
CREATE INDEX IF NOT EXISTS idx_garments_liked ON garments(user_id, liked);