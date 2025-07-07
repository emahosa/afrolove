
-- First, let's drop any existing conflicting policies to start fresh
DROP POLICY IF EXISTS "Allow admins to read system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Allow admins to update system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Allow admins to insert system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Admins can manage system settings" ON public.system_settings;

-- Now create comprehensive policies that handle all admin operations
CREATE POLICY "Admin full access to system settings" 
ON public.system_settings 
FOR ALL 
USING ( 
  EXISTS ( 
    SELECT 1 
    FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::user_role
  ) 
  OR 
  EXISTS (
    SELECT 1 
    FROM auth.users 
    WHERE id = auth.uid() AND email = 'ellaadahosa@gmail.com'
  )
)
WITH CHECK (
  EXISTS ( 
    SELECT 1 
    FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::user_role
  ) 
  OR 
  EXISTS (
    SELECT 1 
    FROM auth.users 
    WHERE id = auth.uid() AND email = 'ellaadahosa@gmail.com'
  )
);
