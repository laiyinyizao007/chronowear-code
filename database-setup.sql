-- ChronoWear AI Database Setup
-- Execute this script in Supabase SQL Editor: https://supabase.com/dashboard/project/udiheaprrtgegajidwqd/sql

-- Create profiles table for user data
CREATE TABLE IF NOT EXISTS public.profiles (
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
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create garments table
CREATE TABLE IF NOT EXISTS public.garments (
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
DROP POLICY IF EXISTS "Users can view own garments" ON public.garments;
CREATE POLICY "Users can view own garments"
  ON public.garments FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own garments" ON public.garments;
CREATE POLICY "Users can insert own garments"
  ON public.garments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own garments" ON public.garments;
CREATE POLICY "Users can update own garments"
  ON public.garments FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own garments" ON public.garments;
CREATE POLICY "Users can delete own garments"
  ON public.garments FOR DELETE
  USING (auth.uid() = user_id);

-- Create OOTD records table
CREATE TABLE IF NOT EXISTS public.ootd_records (
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

-- Create user activity table for tracking usage
CREATE TABLE IF NOT EXISTS public.user_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  first_login_at TIMESTAMPTZ DEFAULT now(),
  last_login_at TIMESTAMPTZ DEFAULT now(),
  login_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

-- OOTD policies
DROP POLICY IF EXISTS "Users can view own OOTD records" ON public.ootd_records;
CREATE POLICY "Users can view own OOTD records"
  ON public.ootd_records FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own OOTD records" ON public.ootd_records;
CREATE POLICY "Users can insert own OOTD records"
  ON public.ootd_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own OOTD records" ON public.ootd_records;
CREATE POLICY "Users can update own OOTD records"
  ON public.ootd_records FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own OOTD records" ON public.ootd_records;
CREATE POLICY "Users can delete own OOTD records"
  ON public.ootd_records FOR DELETE
  USING (auth.uid() = user_id);

-- User activity policies
DROP POLICY IF EXISTS "Users can view own activity" ON public.user_activity;
CREATE POLICY "Users can view own activity"
  ON public.user_activity FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own activity" ON public.user_activity;
CREATE POLICY "Users can insert own activity"
  ON public.user_activity FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own activity" ON public.user_activity;
CREATE POLICY "Users can update own activity"
  ON public.user_activity FOR UPDATE
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
DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS garments_updated_at ON public.garments;
CREATE TRIGGER garments_updated_at
  BEFORE UPDATE ON public.garments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS user_activity_updated_at ON public.user_activity;
CREATE TRIGGER user_activity_updated_at
  BEFORE UPDATE ON public.user_activity
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
  
  -- Initialize user activity record
  INSERT INTO public.user_activity (user_id, first_login_at, last_login_at, login_count)
  VALUES (NEW.id, now(), now(), 1);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to update user login activity (can be called manually)
CREATE OR REPLACE FUNCTION public.update_user_login_activity(user_uuid UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
  target_user_id UUID;
  activity_record RECORD;
BEGIN
  -- Use provided UUID or current user
  target_user_id := COALESCE(user_uuid, auth.uid());
  
  -- Check if user exists
  IF target_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'No user provided');
  END IF;
  
  -- Update or insert user activity
  INSERT INTO public.user_activity (user_id, first_login_at, last_login_at, login_count)
  VALUES (target_user_id, now(), now(), 1)
  ON CONFLICT (user_id) DO UPDATE SET
    last_login_at = now(),
    login_count = user_activity.login_count + 1,
    updated_at = now();
  
  -- Return updated activity data
  SELECT * INTO activity_record
  FROM public.user_activity
  WHERE user_id = target_user_id;
  
  RETURN json_build_object(
    'success', true,
    'user_id', activity_record.user_id,
    'first_login_at', activity_record.first_login_at,
    'last_login_at', activity_record.last_login_at,
    'login_count', activity_record.login_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create storage buckets for garment images and OOTD photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('garments', 'garments', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('ootd-photos', 'ootd-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for garments
DROP POLICY IF EXISTS "Users can upload own garment images" ON storage.objects;
CREATE POLICY "Users can upload own garment images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'garments' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can view own garment images" ON storage.objects;
CREATE POLICY "Users can view own garment images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'garments' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete own garment images" ON storage.objects;
CREATE POLICY "Users can delete own garment images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'garments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for OOTD photos
DROP POLICY IF EXISTS "Users can upload own OOTD photos" ON storage.objects;
CREATE POLICY "Users can upload own OOTD photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'ootd-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can view own OOTD photos" ON storage.objects;
CREATE POLICY "Users can view own OOTD photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'ootd-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete own OOTD photos" ON storage.objects;
CREATE POLICY "Users can delete own OOTD photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'ootd-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_garments_user_id ON public.garments(user_id);
CREATE INDEX IF NOT EXISTS idx_garments_type ON public.garments(type);
CREATE INDEX IF NOT EXISTS idx_garments_season ON public.garments(season);
CREATE INDEX IF NOT EXISTS idx_ootd_records_user_id ON public.ootd_records(user_id);
CREATE INDEX IF NOT EXISTS idx_ootd_records_date ON public.ootd_records(date);
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON public.user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_last_login ON public.user_activity(last_login_at);

-- Add some helpful comments
COMMENT ON TABLE public.profiles IS 'User profile information';
COMMENT ON TABLE public.garments IS 'User clothing items and accessories';
COMMENT ON TABLE public.ootd_records IS 'Outfit of the day records with photos';
COMMENT ON TABLE public.user_activity IS 'User login activity tracking (first login, last login, login count)';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'ChronoWear AI database setup completed successfully!';
  RAISE NOTICE 'Tables created: profiles, garments, ootd_records, user_activity';
  RAISE NOTICE 'Storage buckets created: garments, ootd-photos';
  RAISE NOTICE 'All policies and triggers are in place.';
  RAISE NOTICE 'User activity tracking enabled (first login, last login, login count).';
END $$;