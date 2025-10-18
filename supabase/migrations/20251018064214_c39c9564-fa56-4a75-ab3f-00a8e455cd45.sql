-- Create ai_plans table to store AI-generated daily outfit plans
CREATE TABLE public.ai_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  title text,
  summary text,
  hairstyle text,
  image_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable Row Level Security
ALTER TABLE public.ai_plans ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own AI plans"
ON public.ai_plans
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI plans"
ON public.ai_plans
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI plans"
ON public.ai_plans
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own AI plans"
ON public.ai_plans
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_ai_plans_updated_at
BEFORE UPDATE ON public.ai_plans
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create index for faster queries
CREATE INDEX idx_ai_plans_user_date ON public.ai_plans(user_id, date);