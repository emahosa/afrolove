-- Enable Row Level Security on the affiliate_payout_requests table
ALTER TABLE public.affiliate_payout_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Allow affiliates to see their own payout requests.
CREATE POLICY "Affiliates can view their own payout requests"
ON public.affiliate_payout_requests
FOR SELECT
USING (auth.uid() = affiliate_user_id);

-- Policy: Allow affiliates to create their own payout requests.
CREATE POLICY "Affiliates can create their own payout requests"
ON public.affiliate_payout_requests
FOR INSERT
WITH CHECK (auth.uid() = affiliate_user_id);

-- Policy: Admins have full access to all payout requests.
CREATE POLICY "Admins have full access to payout requests"
ON public.affiliate_payout_requests
FOR ALL
USING (
    (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') = 1 OR
    (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin') = 1
)
WITH CHECK (
    (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') = 1 OR
    (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin') = 1
);
