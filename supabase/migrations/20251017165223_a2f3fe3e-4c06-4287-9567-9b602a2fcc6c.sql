-- Add body measurements to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS height_cm numeric,
ADD COLUMN IF NOT EXISTS weight_kg numeric,
ADD COLUMN IF NOT EXISTS bust_cm numeric,
ADD COLUMN IF NOT EXISTS waist_cm numeric,
ADD COLUMN IF NOT EXISTS hip_cm numeric,
ADD COLUMN IF NOT EXISTS clothing_size text;