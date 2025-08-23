-- This policy allows any authenticated user to create new storage buckets.
-- This is necessary for the application's functionality that dynamically
-- creates buckets, for example, for new contests.
-- Note: This is a permissive policy. It should be reviewed for security
-- implications in a production environment.

CREATE POLICY "Allow authenticated users to create buckets"
ON storage.buckets
FOR INSERT
TO authenticated
WITH CHECK (true);
