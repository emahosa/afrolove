-- Fix for storage.buckets: Add a SELECT policy for authenticated users
-- This allows the application to correctly check if a bucket already exists.
CREATE POLICY "Allow authenticated users to view buckets"
ON storage.buckets FOR SELECT
TO authenticated
USING (true);

-- Fix for public.system_settings: Update the policy to correctly check for all admin roles
-- This fixes the 406 Not Acceptable error for super_admins.
-- First, drop the old, incorrect policy.
DROP POLICY IF EXISTS "Admins can manage system settings" ON public.system_settings;

-- Then, create the new, correct policy using the is_admin() function.
CREATE POLICY "Admins can manage system settings"
ON public.system_settings
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));
