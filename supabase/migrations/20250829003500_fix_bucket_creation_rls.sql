CREATE POLICY "Allow authenticated users to create their own buckets"
ON storage.buckets FOR INSERT
TO authenticated WITH CHECK (auth.uid() = owner);
