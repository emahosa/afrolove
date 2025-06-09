
-- Create storage bucket for instrumental files
INSERT INTO storage.buckets (id, name, public)
VALUES ('instrumentals', 'instrumentals', true);

-- Create policy to allow authenticated users to upload instrumentals
CREATE POLICY "Allow authenticated users to upload instrumentals"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'instrumentals' AND auth.role() = 'authenticated');

-- Create policy to allow public read access to instrumentals
CREATE POLICY "Allow public read access to instrumentals"
ON storage.objects FOR SELECT
USING (bucket_id = 'instrumentals');

-- Create policy to allow authenticated users to update their instrumentals
CREATE POLICY "Allow authenticated users to update instrumentals"
ON storage.objects FOR UPDATE
USING (bucket_id = 'instrumentals' AND auth.role() = 'authenticated');

-- Create policy to allow authenticated users to delete instrumentals
CREATE POLICY "Allow authenticated users to delete instrumentals"
ON storage.objects FOR DELETE
USING (bucket_id = 'instrumentals' AND auth.role() = 'authenticated');
