CREATE POLICY "Allow affiliates to view their own earnings"
ON public.affiliate_earnings
FOR SELECT
TO authenticated
USING (affiliate_user_id = auth.uid());
