ALTER TABLE public.affiliate_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates can manage their own applications"
ON public.affiliate_applications
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin users can access all affiliate applications"
ON public.affiliate_applications
FOR SELECT
USING (true);
