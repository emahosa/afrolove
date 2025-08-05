DROP POLICY "Affiliates can manage their own applications" ON public.affiliate_applications;
DROP POLICY "Admin users can access all affiliate applications" ON public.affiliate_applications;
ALTER TABLE public.affiliate_applications DISABLE ROW LEVEL SECURITY;
