-- First, drop the existing policy to avoid conflicts
DROP POLICY IF EXISTS "Allow admins full access" ON public.system_settings;

-- Then, create the new, more secure policy
CREATE POLICY "Allow admins full access"
ON public.system_settings
FOR ALL
USING (
  -- The user must be authenticated and have the 'admin' role to see the data
  auth.role() = 'authenticated' AND EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  -- When inserting or updating, the user must be an admin,
  -- and the 'updated_by' column must match their user ID
  auth.role() = 'authenticated' AND EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) AND updated_by = auth.uid()
);

-- Add a comment to explain the purpose of this policy
COMMENT ON POLICY "Allow admins full access" ON public.system_settings IS 'Allows administrators to have full control over system settings, with a check to ensure data integrity.';
