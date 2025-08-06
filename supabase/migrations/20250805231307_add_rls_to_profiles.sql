CREATE POLICY "Allow affiliates to view the profiles of their referred users"
ON public.profiles
FOR SELECT
TO authenticated
USING (referrer_id = auth.uid());
