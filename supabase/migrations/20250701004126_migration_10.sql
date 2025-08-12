
-- First, let's ensure we have the correct structure for affiliate tables
-- Drop and recreate with correct schema

DROP TABLE IF EXISTS public.affiliate_applications CASCADE;
DROP TABLE IF EXISTS public.affiliate_commissions CASCADE;
DROP TABLE IF EXISTS public.affiliate_payout_requests CASCADE;

-- Create affiliate_applications table with correct schema
CREATE TABLE public.affiliate_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    social_media_url TEXT NOT NULL,
    reason_to_join TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    unique_referral_code TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create affiliate_commissions table with correct schema
CREATE TABLE public.affiliate_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    referred_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subscription_payment_id TEXT NOT NULL UNIQUE,
    amount_earned NUMERIC(10, 2) NOT NULL,
    commission_month DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create affiliate_payout_requests table with correct schema
CREATE TABLE public.affiliate_payout_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    requested_amount NUMERIC(10, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ,
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add referrer_id to profiles table if not exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referrer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Update user_role ENUM to include affiliate if not exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
        ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'affiliate';
    END IF;
END $$;

-- Enable RLS and create policies for affiliate_applications
ALTER TABLE public.affiliate_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own affiliate applications"
ON public.affiliate_applications
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all affiliate applications"
ON public.affiliate_applications
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'super_admin')
    )
    OR 
    EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = auth.uid() 
        AND email = 'ellaadahosa@gmail.com'
    )
);

-- Enable RLS and create policies for affiliate_commissions
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates can view their own commissions"
ON public.affiliate_commissions
FOR SELECT
USING (auth.uid() = affiliate_user_id);

CREATE POLICY "Admins can view all commissions"
ON public.affiliate_commissions
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'super_admin')
    )
    OR 
    EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = auth.uid() 
        AND email = 'ellaadahosa@gmail.com'
    )
);

-- Enable RLS and create policies for affiliate_payout_requests
ALTER TABLE public.affiliate_payout_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates can manage their own payout requests"
ON public.affiliate_payout_requests
FOR ALL
USING (auth.uid() = affiliate_user_id)
WITH CHECK (auth.uid() = affiliate_user_id);

CREATE POLICY "Admins can view all payout requests"
ON public.affiliate_payout_requests
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'super_admin')
    )
    OR 
    EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = auth.uid() 
        AND email = 'ellaadahosa@gmail.com'
    )
);

-- Create indexes for performance
CREATE INDEX idx_affiliate_applications_user_id ON public.affiliate_applications(user_id);
CREATE INDEX idx_affiliate_applications_status ON public.affiliate_applications(status);
CREATE INDEX idx_affiliate_commissions_affiliate_user_id ON public.affiliate_commissions(affiliate_user_id);
CREATE INDEX idx_affiliate_commissions_referred_user_id ON public.affiliate_commissions(referred_user_id);
CREATE INDEX idx_affiliate_payout_requests_affiliate_user_id ON public.affiliate_payout_requests(affiliate_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_referrer_id ON public.profiles(referrer_id);

-- Add updated_at triggers
CREATE TRIGGER handle_updated_at_affiliate_applications
BEFORE UPDATE ON public.affiliate_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER handle_updated_at_affiliate_payout_requests
BEFORE UPDATE ON public.affiliate_payout_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
