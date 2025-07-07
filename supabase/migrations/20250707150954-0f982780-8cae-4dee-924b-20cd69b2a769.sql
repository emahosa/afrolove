
-- First, let's check if there are any conflicting policies and create the proper admin access policy
-- This policy allows admins to read system settings
CREATE POLICY "Allow admins to read system settings" 
ON public.system_settings 
FOR SELECT 
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
);

-- This policy allows admins to update system settings
CREATE POLICY "Allow admins to update system settings" 
ON public.system_settings 
FOR UPDATE 
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
);

-- This policy allows admins to insert system settings
CREATE POLICY "Allow admins to insert system settings" 
ON public.system_settings 
FOR INSERT 
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
