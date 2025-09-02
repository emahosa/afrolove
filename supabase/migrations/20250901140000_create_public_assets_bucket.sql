-- Create a new bucket for public assets if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('public-assets', 'public-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for the public-assets bucket

-- Allow public read access to all files in the bucket
CREATE POLICY "Public can view all assets"
ON storage.objects
FOR SELECT
USING (bucket_id = 'public-assets');

-- Allow authenticated admins to upload, update, and delete files
CREATE POLICY "Admins can manage assets"
ON storage.objects
FOR ALL
USING (bucket_id = 'public-assets' AND is_admin(auth.uid()))
WITH CHECK (bucket_id = 'public-assets' AND is_admin(auth.uid()));
