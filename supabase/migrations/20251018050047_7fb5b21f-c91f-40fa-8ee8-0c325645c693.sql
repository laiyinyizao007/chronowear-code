-- Create trends table
CREATE TABLE IF NOT EXISTS public.trends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on trends table
ALTER TABLE public.trends ENABLE ROW LEVEL SECURITY;

-- RLS policies for trends
CREATE POLICY "Users can view own trends" 
  ON public.trends 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trends" 
  ON public.trends 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trends" 
  ON public.trends 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trends" 
  ON public.trends 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Add trend_id column to saved_outfits table
ALTER TABLE public.saved_outfits 
  ADD COLUMN IF NOT EXISTS trend_id UUID REFERENCES public.trends(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_saved_outfits_trend_id ON public.saved_outfits(trend_id);

-- Add trigger for automatic updated_at timestamp on trends
CREATE TRIGGER update_trends_updated_at
  BEFORE UPDATE ON public.trends
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();