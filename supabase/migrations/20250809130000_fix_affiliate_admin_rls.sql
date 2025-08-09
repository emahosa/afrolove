-- Drop the existing placeholder policy for admin access on affiliate_applications
DROP POLICY IF EXISTS "Admin users can access all affiliate applications" ON public.affiliate_applications;

-- Create a comprehensive new policy for admins
CREATE POLICY "Admins have full access to affiliate applications"
ON public.affiliate_applications
FOR ALL
USING (
    (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') = 1 OR
    (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin') = 1
)
WITH CHECK (
    (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') = 1 OR
    (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin') = 1
);

-- Ensure RLS is enabled on the table, if it wasn't already
ALTER TABLE public.affiliate_applications ENABLE ROW LEVEL SECURITY;
