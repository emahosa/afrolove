-- Create the private bucket for producer ID documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('producer-id-documents', 'producer-id-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Add comments for clarity
COMMENT ON TABLE storage.buckets IS 'Stores file buckets';

-- Add policies for the new bucket
-- 1. Users can upload their own ID document.
-- We'll use the user's ID as a path prefix to scope their access.
-- The user must upload to a folder that matches their UID.
CREATE POLICY "Users can upload their own ID document"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'producer-id-documents' AND (storage.foldername(name))[1] = auth.uid()::text );

-- 2. Users can view their own uploaded document.
CREATE POLICY "Users can view their own ID document"
ON storage.objects FOR SELECT
TO authenticated
USING ( bucket_id = 'producer-id-documents' AND (storage.foldername(name))[1] = auth.uid()::text );

-- 3. Users can update their own document (e.g., if they need to re-upload).
CREATE POLICY "Users can update their own ID document"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'producer-id-documents' AND (storage.foldername(name))[1] = auth.uid()::text );

-- 4. Admins have full access to all documents in the bucket.
CREATE POLICY "Admins can manage all ID documents"
ON storage.objects FOR ALL
USING ( bucket_id = 'producer-id-documents' AND public.is_admin(auth.uid()) );
