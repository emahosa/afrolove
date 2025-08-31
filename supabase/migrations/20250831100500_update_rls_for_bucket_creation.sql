-- Grant insert permission on storage.buckets to authenticated users
GRANT INSERT ON TABLE storage.buckets TO authenticated;

-- Drop the old restrictive policy if it exists
DROP POLICY IF EXISTS "Allow bucket creation for storage admin" ON storage.buckets;

-- Create a new policy that allows authenticated users to create the 'contest-videos' bucket
CREATE POLICY "Allow authenticated users to create contest-videos bucket"
ON storage.buckets FOR INSERT TO authenticated
WITH CHECK ( name = 'contest-videos' );
