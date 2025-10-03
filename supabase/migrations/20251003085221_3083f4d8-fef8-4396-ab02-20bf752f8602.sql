-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  geo_location TEXT,
  style_preference TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create garments table
CREATE TABLE public.garments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  type TEXT NOT NULL, -- Top, Pants, Outerwear, Dress, Shoes, Accessories
  color TEXT,
  season TEXT, -- Spring, Summer, Fall, Winter, All-Season
  material TEXT,
  brand TEXT,
  last_worn_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.garments ENABLE ROW LEVEL SECURITY;

-- Garments policies
CREATE POLICY "Users can view own garments"
  ON public.garments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own garments"
  ON public.garments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own garments"
  ON public.garments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own garments"
  ON public.garments FOR DELETE
  USING (auth.uid() = user_id);

-- Create OOTD records table
CREATE TABLE public.ootd_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  location TEXT,
  weather TEXT,
  notes TEXT,
  garment_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ootd_records ENABLE ROW LEVEL SECURITY;

-- OOTD policies
CREATE POLICY "Users can view own OOTD records"
  ON public.ootd_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own OOTD records"
  ON public.ootd_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own OOTD records"
  ON public.ootd_records FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own OOTD records"
  ON public.ootd_records FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER garments_updated_at
  BEFORE UPDATE ON public.garments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create storage bucket for garment images
INSERT INTO storage.buckets (id, name, public) VALUES ('garments', 'garments', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('ootd-photos', 'ootd-photos', true);

-- Storage policies for garments
CREATE POLICY "Users can upload own garment images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'garments' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own garment images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'garments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own garment images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'garments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for OOTD photos
CREATE POLICY "Users can upload own OOTD photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'ootd-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own OOTD photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'ootd-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own OOTD photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'ootd-photos' AND auth.uid()::text = (storage.foldername(name))[1]);