-- Create the private bucket for final produced tracks
INSERT INTO storage.buckets (id, name, public)
VALUES ('final-tracks', 'final-tracks', false)
ON CONFLICT (id) DO NOTHING;

-- Policies for final-tracks bucket
-- 1. Producers can upload final tracks.
-- We will assume the path is {producer_id}/{request_id}/{filename}
-- This policy checks that the producer is uploading into their own folder.
CREATE POLICY "Producers can upload final tracks"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'final-tracks' AND public.has_role('producer') AND (storage.foldername(name))[1] = auth.uid()::text );

-- 2. Producers can see their own uploaded files to create signed URLs for them.
CREATE POLICY "Producers can view their own final tracks"
ON storage.objects FOR SELECT
USING ( bucket_id = 'final-tracks' AND public.has_role('producer') AND (storage.foldername(name))[1] = auth.uid()::text );

-- 3. Admins have full access to all documents in the bucket.
CREATE POLICY "Admins can manage all final tracks"
ON storage.objects FOR ALL
USING ( bucket_id = 'final-tracks' AND public.is_admin(auth.uid()) );
