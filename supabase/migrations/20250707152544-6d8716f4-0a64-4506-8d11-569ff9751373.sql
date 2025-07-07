
-- Drop the current policy that might be causing issues
DROP POLICY IF EXISTS "Admin full access to system settings" ON public.system_settings;

-- Create a new policy that doesn't try to query auth.users table
CREATE POLICY "Admins can manage system settings" 
ON public.system_settings 
FOR ALL 
USING ( 
  -- Check if user has admin role in user_roles table
  EXISTS ( 
    SELECT 1 
    FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::user_role
  ) 
  OR 
  -- Direct check for super admin UUID (safer than querying auth.users)
  auth.uid() = '1a7e4d46-b4f2-464e-a1f4-2766836286c1'::uuid
)
WITH CHECK (
  -- Same check for insert/update operations
  EXISTS ( 
    SELECT 1 
    FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::user_role
  ) 
  OR 
  auth.uid() = '1a7e4d46-b4f2-464e-a1f4-2766836286c1'::uuid
);
