-- Create table for saved outfit combinations
CREATE TABLE public.saved_outfits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  hairstyle TEXT,
  summary TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_outfits ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own saved outfits"
ON public.saved_outfits
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved outfits"
ON public.saved_outfits
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved outfits"
ON public.saved_outfits
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved outfits"
ON public.saved_outfits
FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_saved_outfits_updated_at
BEFORE UPDATE ON public.saved_outfits
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();