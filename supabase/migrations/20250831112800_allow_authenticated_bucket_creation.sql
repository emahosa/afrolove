-- Drop the existing policy
DROP POLICY IF EXISTS "Allow authenticated users to create their own buckets" ON storage.buckets;

-- Create a new, more permissive policy
CREATE POLICY "Allow authenticated users to create buckets"
ON storage.buckets FOR INSERT
TO authenticated WITH CHECK (true);
