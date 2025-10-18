-- Add missing profile fields for detailed user measurements and preferences
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS bra_cup text,
ADD COLUMN IF NOT EXISTS eye_color text,
ADD COLUMN IF NOT EXISTS hair_color text,
ADD COLUMN IF NOT EXISTS shoe_size numeric;