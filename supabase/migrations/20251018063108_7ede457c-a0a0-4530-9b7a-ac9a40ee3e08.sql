-- Add fields to trends table for storing fashion trend details
ALTER TABLE trends
ADD COLUMN IF NOT EXISTS summary text,
ADD COLUMN IF NOT EXISTS hairstyle text,
ADD COLUMN IF NOT EXISTS items jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS weather jsonb,
ADD COLUMN IF NOT EXISTS date date DEFAULT CURRENT_DATE;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_trends_user_date ON trends(user_id, date DESC);