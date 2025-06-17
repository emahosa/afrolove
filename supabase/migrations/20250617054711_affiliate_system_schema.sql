-- Modify profiles table
ALTER TABLE public.profiles
ADD COLUMN referrer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Create affiliate_applications table
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

-- Create affiliate_commissions table
CREATE TABLE public.affiliate_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    referred_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subscription_payment_id TEXT NOT NULL,
    amount_earned NUMERIC(10, 2) NOT NULL,
    commission_month DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create affiliate_payout_requests table
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

-- Update user_role ENUM
-- First, check if the type exists. This is more of a procedural check.
-- For a migration script, we might assume it exists or handle errors.
-- The command below will fail if the type doesn't exist.
-- Consider adding IF NOT EXISTS for the value if your PostgreSQL version supports it,
-- or handle this within a plpgsql block for more robust error handling.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
        ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'affiliate';
    END IF;
END $$;

-- Add RLS policies (example for affiliate_applications, repeat for others as needed)
ALTER TABLE public.affiliate_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates can manage their own applications"
ON public.affiliate_applications
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin users can access all affiliate applications"
ON public.affiliate_applications
FOR SELECT
USING (true); -- Replace with your actual admin role check logic

-- Similar RLS policies should be created for:
-- affiliate_commissions (e.g., affiliates can see their commissions, admin can see all)
-- affiliate_payout_requests (e.g., affiliates can create/see their requests, admin can manage all)

-- Add indexes for foreign keys and frequently queried columns
CREATE INDEX idx_profiles_referrer_id ON public.profiles(referrer_id);
CREATE INDEX idx_affiliate_applications_user_id ON public.affiliate_applications(user_id);
CREATE INDEX idx_affiliate_commissions_affiliate_user_id ON public.affiliate_commissions(affiliate_user_id);
CREATE INDEX idx_affiliate_commissions_referred_user_id ON public.affiliate_commissions(referred_user_id);
CREATE INDEX idx_affiliate_payout_requests_affiliate_user_id ON public.affiliate_payout_requests(affiliate_user_id);

-- Trigger function to update 'updated_at' columns
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to tables with 'updated_at'
CREATE TRIGGER handle_updated_at_affiliate_applications
BEFORE UPDATE ON public.affiliate_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER handle_updated_at_affiliate_payout_requests
BEFORE UPDATE ON public.affiliate_payout_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
