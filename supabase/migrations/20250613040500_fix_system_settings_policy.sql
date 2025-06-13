
-- Drop the existing policy
DROP POLICY IF EXISTS "Admins can manage system settings" ON public.system_settings;

-- Create a better policy for admins to manage settings
CREATE POLICY "Admins can manage system settings"
ON public.system_settings
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
  OR
  auth.uid() IN (
    SELECT id FROM auth.users 
    WHERE email = 'ellaadahosa@gmail.com'
  )
);
