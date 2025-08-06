CREATE POLICY "Allow affiliates to view their own payout requests"
ON public.affiliate_payout_requests
FOR SELECT
TO authenticated
USING (affiliate_user_id = auth.uid());

CREATE POLICY "Allow affiliates to create their own payout requests"
ON public.affiliate_payout_requests
FOR INSERT
TO authenticated
WITH CHECK (affiliate_user_id = auth.uid());
