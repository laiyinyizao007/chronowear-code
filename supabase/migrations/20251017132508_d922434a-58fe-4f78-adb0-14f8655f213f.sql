-- Create public bucket for rehosting real product images
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- Allow public read access to product images (idempotent)
DO $$
BEGIN
  CREATE POLICY "Public read access for product-images"
    ON storage.objects
    FOR SELECT
    USING ( bucket_id = 'product-images' );
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;