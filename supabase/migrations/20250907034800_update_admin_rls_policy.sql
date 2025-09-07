-- Drop the old policy that has the logic directly embedded
DROP POLICY IF EXISTS "Admins can manage system settings" ON public.system_settings;

-- Create a new policy that uses the is_admin() function
CREATE POLICY "Admins can manage system settings"
ON public.system_settings
FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));
