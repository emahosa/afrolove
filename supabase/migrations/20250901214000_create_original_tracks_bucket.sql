-- Create the private bucket for original AI tracks for reproduction
INSERT INTO storage.buckets (id, name, public)
VALUES ('original-ai-tracks', 'original-ai-tracks', false)
ON CONFLICT (id) DO NOTHING;

-- Policies for original-ai-tracks bucket
-- Users can upload tracks into a folder corresponding to their user ID.
CREATE POLICY "Users can upload original tracks"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'original-ai-tracks' AND (storage.foldername(name))[1] = auth.uid()::text );

-- Users can view their own tracks.
CREATE POLICY "Users can view their own original tracks"
ON storage.objects FOR SELECT
TO authenticated
USING ( bucket_id = 'original-ai-tracks' AND (storage.foldername(name))[1] = auth.uid()::text );

-- Note: Access for producers and admins to these tracks will be handled via signed URLs
-- generated on the backend when needed, so no additional SELECT policies are required here.
