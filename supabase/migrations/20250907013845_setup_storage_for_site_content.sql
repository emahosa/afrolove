-- Create site-content bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('site-content', 'site-content', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policy for bucket creation
DROP POLICY IF EXISTS "Allow authenticated users to create buckets" ON storage.buckets;
CREATE POLICY "Allow authenticated users to create buckets"
ON storage.buckets FOR INSERT
TO authenticated
WITH CHECK (true);

-- RLS policy for listing buckets
DROP POLICY IF EXISTS "Allow authenticated users to list buckets" ON storage.buckets;
CREATE POLICY "Allow authenticated users to list buckets"
ON storage.buckets FOR SELECT
TO authenticated
USING (true);

-- RLS policies for site-content bucket objects
DROP POLICY IF EXISTS "Allow admin uploads to site-content" ON storage.objects;
CREATE POLICY "Allow admin uploads to site-content"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'site-content' AND
  (get_my_claim('user_role'::text) = '"admin"'::jsonb)
);

DROP POLICY IF EXISTS "Allow admin updates to site-content" ON storage.objects;
CREATE POLICY "Allow admin updates to site-content"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'site-content' AND
  (get_my_claim('user_role'::text) = '"admin"'::jsonb)
);

DROP POLICY IF EXISTS "Allow public read access to site-content" ON storage.objects;
CREATE POLICY "Allow public read access to site-content"
ON storage.objects FOR SELECT
TO anon, authenticated
USING ( bucket_id = 'site-content' );
