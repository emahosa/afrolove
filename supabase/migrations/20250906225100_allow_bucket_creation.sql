CREATE POLICY "Allow authenticated users to create buckets"
ON storage.buckets
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to select buckets"
ON storage.buckets
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to update buckets"
ON storage.buckets
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete buckets"
ON storage.buckets
FOR DELETE
TO authenticated
USING (true);
