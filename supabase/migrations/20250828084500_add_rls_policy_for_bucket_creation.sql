CREATE POLICY "Allow bucket creation for storage admin"
ON storage.buckets FOR INSERT
TO supabase_storage_admin WITH CHECK (true);
