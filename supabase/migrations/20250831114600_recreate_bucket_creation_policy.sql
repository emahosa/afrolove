-- This migration fixes the RLS policy for bucket creation.
-- It drops the old, restrictive policy and creates a new one
-- that allows any authenticated user to create a bucket, which is
-- required for the app's file upload functionality.

DROP POLICY IF EXISTS "Allow authenticated users to create their own buckets" ON storage.buckets;
DROP POLICY IF EXISTS "Allow authenticated users to create buckets" ON storage.buckets;

CREATE POLICY "Allow authenticated users to create buckets"
ON storage.buckets FOR INSERT
TO authenticated
WITH CHECK (auth.role() = 'authenticated');
