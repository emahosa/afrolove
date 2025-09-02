-- Create the private bucket for user vocal recordings
INSERT INTO storage.buckets (id, name, public)
VALUES ('vocal-recordings', 'vocal-recordings', false)
ON CONFLICT (id) DO NOTHING;

-- Policies for vocal-recordings bucket
-- Users can upload recordings into a folder corresponding to their user ID.
CREATE POLICY "Users can upload vocal recordings"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'vocal-recordings' AND (storage.foldername(name))[1] = auth.uid()::text );

-- Users can view their own recordings.
CREATE POLICY "Users can view their own vocal recordings"
ON storage.objects FOR SELECT
TO authenticated
USING ( bucket_id = 'vocal-recordings' AND (storage.foldername(name))[1] = auth.uid()::text );

-- Note: Access for producers and admins to these tracks will be handled via signed URLs
-- generated on the backend when needed, so no additional SELECT policies are required here.
