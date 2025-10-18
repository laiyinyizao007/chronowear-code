-- Create table for Today's Pick
CREATE TABLE public.todays_picks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  title TEXT NOT NULL,
  summary TEXT,
  hairstyle TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  image_url TEXT,
  weather JSONB,
  is_liked BOOLEAN NOT NULL DEFAULT false,
  added_to_ootd BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable Row Level Security
ALTER TABLE public.todays_picks ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own todays picks" 
ON public.todays_picks 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own todays picks" 
ON public.todays_picks 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own todays picks" 
ON public.todays_picks 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own todays picks" 
ON public.todays_picks 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_todays_picks_updated_at
BEFORE UPDATE ON public.todays_picks
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create index for faster queries
CREATE INDEX idx_todays_picks_user_date ON public.todays_picks(user_id, date);