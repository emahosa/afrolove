-- Step 1: Add total_clicks column to the affiliate_applications table
ALTER TABLE public.affiliate_applications
ADD COLUMN total_clicks INT NOT NULL DEFAULT 0;

-- Step 2: Create the affiliate_clicks table to log each click event
CREATE TABLE public.affiliate_clicks (
    id BIGSERIAL PRIMARY KEY,
    affiliate_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add Index for faster lookups
CREATE INDEX idx_affiliate_clicks_affiliate_user_id ON public.affiliate_clicks(affiliate_user_id);

-- Step 3: Create a trigger function to increment total_clicks
CREATE OR REPLACE FUNCTION public.increment_affiliate_click_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.affiliate_applications
    SET total_clicks = total_clicks + 1
    WHERE user_id = NEW.affiliate_user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create a trigger that calls the function after a new click is inserted
CREATE TRIGGER on_affiliate_click_increment_count
AFTER INSERT ON public.affiliate_clicks
FOR EACH ROW
EXECUTE FUNCTION public.increment_affiliate_click_count();

-- Step 5: Add RLS policies for affiliate_clicks
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public, anonymous access to insert clicks.
-- The `track-affiliate-click` function will handle the logic, so this can be permissive.
CREATE POLICY "Allow public insert for affiliate clicks"
ON public.affiliate_clicks
FOR INSERT
WITH CHECK (true);

-- Policy: Admins can see all clicks.
CREATE POLICY "Admins can view all affiliate clicks"
ON public.affiliate_clicks
FOR SELECT
USING (
    (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') = 1 OR
    (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin') = 1
);

-- Policy: Affiliates can only see their own clicks.
CREATE POLICY "Affiliates can view their own clicks"
ON public.affiliate_clicks
FOR SELECT
USING (auth.uid() = affiliate_user_id);
