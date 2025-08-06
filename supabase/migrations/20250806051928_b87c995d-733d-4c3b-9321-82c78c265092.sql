
-- Add IP address tracking to profiles table for referral validation
ALTER TABLE public.profiles 
ADD COLUMN ip_address INET,
ADD COLUMN device_id TEXT;

-- Create affiliate_links table for proper link tracking
CREATE TABLE public.affiliate_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    link_code TEXT NOT NULL UNIQUE,
    clicks_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create affiliate_wallets table for earnings management
CREATE TABLE public.affiliate_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    balance DECIMAL(10,2) DEFAULT 0,
    total_earned DECIMAL(10,2) DEFAULT 0,
    total_withdrawn DECIMAL(10,2) DEFAULT 0,
    usdt_wallet_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create affiliate_earnings table for detailed tracking
CREATE TABLE public.affiliate_earnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    referred_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    earning_type TEXT NOT NULL CHECK (earning_type IN ('free_referral', 'subscription_commission')),
    amount DECIMAL(10,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ
);

-- Create user_activities table for tracking user actions
CREATE TABLE public.user_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    referrer_affiliate_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.affiliate_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for affiliate_links
CREATE POLICY "Affiliates can view their own links" ON public.affiliate_links
    FOR SELECT USING (auth.uid() = affiliate_user_id);
CREATE POLICY "Admins can manage all affiliate links" ON public.affiliate_links
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
        OR auth.uid() = '1a7e4d46-b4f2-464e-a1f4-2766836286c1'
    );

-- RLS Policies for affiliate_wallets
CREATE POLICY "Affiliates can view their own wallet" ON public.affiliate_wallets
    FOR SELECT USING (auth.uid() = affiliate_user_id);
CREATE POLICY "Admins can manage all wallets" ON public.affiliate_wallets
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
        OR auth.uid() = '1a7e4d46-b4f2-464e-a1f4-2766836286c1'
    );

-- RLS Policies for affiliate_earnings
CREATE POLICY "Affiliates can view their own earnings" ON public.affiliate_earnings
    FOR SELECT USING (auth.uid() = affiliate_user_id);
CREATE POLICY "Admins can manage all earnings" ON public.affiliate_earnings
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
        OR auth.uid() = '1a7e4d46-b4f2-464e-a1f4-2766836286c1'
    );

-- RLS Policies for user_activities
CREATE POLICY "Users can view their own activities" ON public.user_activities
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all activities" ON public.user_activities
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
        OR auth.uid() = '1a7e4d46-b4f2-464e-a1f4-2766836286c1'
    );

-- Add system settings for affiliate program configuration
INSERT INTO public.system_settings (key, value, category, description) VALUES
('affiliate_program_enabled', 'true', 'affiliate', 'Enable/disable affiliate program'),
('affiliate_free_referral_enabled', 'true', 'affiliate', 'Enable/disable free referral earnings'),
('affiliate_subscription_commission_enabled', 'true', 'affiliate', 'Enable/disable subscription commission'),
('affiliate_free_referral_compensation', '0.10', 'affiliate', 'Amount paid per free referral'),
('affiliate_subscription_commission_percent', '10', 'affiliate', 'Commission percentage for subscriptions'),
('affiliate_minimum_withdrawal', '50', 'affiliate', 'Minimum withdrawal amount'),
('affiliate_withdrawal_fee_percent', '10', 'affiliate', 'Withdrawal fee percentage')
ON CONFLICT (key) DO NOTHING;

-- Create function to automatically create affiliate links when application is approved
CREATE OR REPLACE FUNCTION create_affiliate_links_on_approval()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create links when status changes to approved
    IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
        -- Create affiliate link
        INSERT INTO public.affiliate_links (affiliate_user_id, link_code)
        VALUES (NEW.user_id, NEW.unique_referral_code);
        
        -- Create affiliate wallet
        INSERT INTO public.affiliate_wallets (affiliate_user_id, usdt_wallet_address)
        VALUES (NEW.user_id, NEW.usdt_wallet_address)
        ON CONFLICT DO NOTHING;
        
        -- Add affiliate role
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.user_id, 'affiliate')
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for affiliate application approval
CREATE TRIGGER on_affiliate_application_approved
    AFTER UPDATE ON public.affiliate_applications
    FOR EACH ROW
    EXECUTE FUNCTION create_affiliate_links_on_approval();

-- Add affiliate role to user_role enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role' AND typelem = 0) THEN
        CREATE TYPE public.user_role AS ENUM ('user', 'admin', 'subscriber', 'voter', 'affiliate', 'super_admin', 'moderator');
    ELSE
        BEGIN
            ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'affiliate';
        EXCEPTION
            WHEN duplicate_object THEN null;
        END;
    END IF;
END $$;
