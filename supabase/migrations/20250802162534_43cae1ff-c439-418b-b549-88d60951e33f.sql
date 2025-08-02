
-- Add withdrawal fee and minimum withdrawal settings
INSERT INTO public.system_settings (key, value, description, category) 
VALUES 
  ('affiliate_withdrawal_fee_percent', '10', 'Percentage fee charged on affiliate withdrawals', 'affiliate'),
  ('affiliate_minimum_withdrawal', '50', 'Minimum amount required for affiliate withdrawals in USD', 'affiliate'),
  ('affiliate_free_referral_compensation', '0.10', 'Compensation amount for free active referrals in USD', 'affiliate'),
  ('affiliate_program_enabled', 'true', 'Whether the affiliate program is currently active', 'affiliate'),
  ('affiliate_subscription_commission_percent', '10', 'Commission percentage for subscription referrals', 'affiliate')
ON CONFLICT (key) DO NOTHING;

-- Add rejection_date and usdt_wallet_address to affiliate_applications
ALTER TABLE public.affiliate_applications 
ADD COLUMN IF NOT EXISTS rejection_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS usdt_wallet_address TEXT;

-- Create affiliate_links table for tracking
CREATE TABLE IF NOT EXISTS public.affiliate_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    link_code TEXT NOT NULL UNIQUE,
    clicks_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_activities table for tracking user actions
CREATE TABLE IF NOT EXISTS public.user_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL, -- 'signup', 'subscription_page_visit', 'subscription_completed'
    referrer_affiliate_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata JSONB
);

-- Create affiliate_earnings table to track different types of earnings
CREATE TABLE IF NOT EXISTS public.affiliate_earnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    referred_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    earning_type TEXT NOT NULL, -- 'free_referral', 'subscription_commission'
    amount DECIMAL(10,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'paid'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ
);

-- Create affiliate_wallets table for storing wallet balances
CREATE TABLE IF NOT EXISTS public.affiliate_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_earned DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_withdrawn DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    usdt_wallet_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Update affiliate_payout_requests to include usdt_wallet_address and withdrawal_fee
ALTER TABLE public.affiliate_payout_requests 
ADD COLUMN IF NOT EXISTS usdt_wallet_address TEXT,
ADD COLUMN IF NOT EXISTS withdrawal_fee DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS net_amount DECIMAL(10,2);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_affiliate_links_code ON public.affiliate_links (link_code);
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON public.user_activities (user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_referrer ON public.user_activities (referrer_affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_earnings_affiliate ON public.affiliate_earnings (affiliate_user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_earnings_referred ON public.affiliate_earnings (referred_user_id);

-- Enable RLS on new tables
ALTER TABLE public.affiliate_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_wallets ENABLE ROW LEVEL SECURITY;

-- RLS policies for affiliate_links
CREATE POLICY "Affiliates can view their own links"
ON public.affiliate_links FOR ALL
USING (auth.uid() = affiliate_user_id)
WITH CHECK (auth.uid() = affiliate_user_id);

CREATE POLICY "Admins can view all affiliate links"
ON public.affiliate_links FOR ALL
USING (has_role('admin'::user_role) OR has_role('super_admin'::user_role));

-- RLS policies for user_activities
CREATE POLICY "Users can view their own activities"
ON public.user_activities FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert activities"
ON public.user_activities FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view all activities"
ON public.user_activities FOR ALL
USING (has_role('admin'::user_role) OR has_role('super_admin'::user_role));

-- RLS policies for affiliate_earnings
CREATE POLICY "Affiliates can view their own earnings"
ON public.affiliate_earnings FOR SELECT
USING (auth.uid() = affiliate_user_id);

CREATE POLICY "Admins can manage all earnings"
ON public.affiliate_earnings FOR ALL
USING (has_role('admin'::user_role) OR has_role('super_admin'::user_role));

-- RLS policies for affiliate_wallets
CREATE POLICY "Affiliates can view and update their own wallet"
ON public.affiliate_wallets FOR ALL
USING (auth.uid() = affiliate_user_id)
WITH CHECK (auth.uid() = affiliate_user_id);

CREATE POLICY "Admins can view all wallets"
ON public.affiliate_wallets FOR SELECT
USING (has_role('admin'::user_role) OR has_role('super_admin'::user_role));

-- Function to check if user can reapply for affiliate (60 days after rejection)
CREATE OR REPLACE FUNCTION public.can_reapply_for_affiliate(user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT CASE
        WHEN NOT EXISTS (
            SELECT 1 FROM affiliate_applications 
            WHERE user_id = user_id_param AND status = 'rejected'
        ) THEN true
        WHEN EXISTS (
            SELECT 1 FROM affiliate_applications 
            WHERE user_id = user_id_param 
            AND status = 'rejected' 
            AND rejection_date IS NOT NULL 
            AND rejection_date + INTERVAL '60 days' <= NOW()
        ) THEN true
        ELSE false
    END;
$$;

-- Function to generate unique affiliate link code
CREATE OR REPLACE FUNCTION public.generate_affiliate_link_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    code TEXT;
    counter INTEGER := 0;
BEGIN
    LOOP
        code := 'REF' || UPPER(substr(md5(random()::text || counter::text), 1, 8));
        
        IF NOT EXISTS (SELECT 1 FROM affiliate_links WHERE link_code = code) THEN
            RETURN code;
        END IF;
        
        counter := counter + 1;
        IF counter > 1000 THEN
            RAISE EXCEPTION 'Could not generate unique affiliate link code';
        END IF;
    END LOOP;
END;
$$;

-- Trigger to create affiliate wallet when application is approved
CREATE OR REPLACE FUNCTION public.create_affiliate_wallet()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Create wallet when application is approved
    IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
        INSERT INTO public.affiliate_wallets (affiliate_user_id, usdt_wallet_address)
        VALUES (NEW.user_id, NEW.usdt_wallet_address)
        ON CONFLICT (affiliate_user_id) DO UPDATE SET
            usdt_wallet_address = EXCLUDED.usdt_wallet_address;
            
        -- Create affiliate link
        INSERT INTO public.affiliate_links (affiliate_user_id, link_code)
        VALUES (NEW.user_id, generate_affiliate_link_code())
        ON CONFLICT DO NOTHING;
    END IF;
    
    -- Set rejection date when application is rejected
    IF NEW.status = 'rejected' AND (OLD.status IS NULL OR OLD.status != 'rejected') THEN
        NEW.rejection_date = NOW();
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER handle_affiliate_application_status
    BEFORE UPDATE ON public.affiliate_applications
    FOR EACH ROW
    EXECUTE FUNCTION public.create_affiliate_wallet();

-- Trigger to update wallet balance when earnings are added
CREATE OR REPLACE FUNCTION public.update_affiliate_wallet_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.affiliate_wallets (affiliate_user_id, balance, total_earned)
        VALUES (NEW.affiliate_user_id, NEW.amount, NEW.amount)
        ON CONFLICT (affiliate_user_id) DO UPDATE SET
            balance = affiliate_wallets.balance + NEW.amount,
            total_earned = affiliate_wallets.total_earned + NEW.amount,
            updated_at = NOW();
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;

CREATE TRIGGER update_wallet_on_earning
    AFTER INSERT ON public.affiliate_earnings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_affiliate_wallet_balance();

-- Update existing trigger functions
CREATE TRIGGER handle_updated_at_affiliate_links
BEFORE UPDATE ON public.affiliate_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER handle_updated_at_affiliate_wallets
BEFORE UPDATE ON public.affiliate_wallets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
