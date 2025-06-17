
-- Create affiliate applications table
CREATE TABLE public.affiliate_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  social_media_url TEXT,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create affiliates table for approved affiliates
CREATE TABLE public.affiliates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  affiliate_code TEXT NOT NULL UNIQUE,
  referral_link TEXT NOT NULL,
  total_earnings DECIMAL(10,2) NOT NULL DEFAULT 0,
  pending_withdrawals DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_withdrawals DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create referrals table to track who referred whom
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  conversion_date TIMESTAMP WITH TIME ZONE,
  is_converted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create affiliate commissions table to track earnings
CREATE TABLE public.affiliate_commissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  referral_id UUID NOT NULL REFERENCES public.referrals(id) ON DELETE CASCADE,
  subscription_payment_id TEXT, -- Stripe subscription payment ID
  commission_amount DECIMAL(10,2) NOT NULL,
  commission_rate DECIMAL(5,4) NOT NULL DEFAULT 0.15, -- 15%
  payment_month INTEGER NOT NULL,
  payment_year INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create affiliate withdrawals table
CREATE TABLE public.affiliate_withdrawals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  bank_details JSONB,
  notes TEXT,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID REFERENCES public.profiles(id)
);

-- Add referrer_id to profiles table to track who referred each user
ALTER TABLE public.profiles ADD COLUMN referrer_id UUID REFERENCES public.affiliates(id);

-- Add affiliate role to user_role enum
ALTER TYPE public.user_role ADD VALUE 'affiliate';

-- Enable RLS on all affiliate tables
ALTER TABLE public.affiliate_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_withdrawals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for affiliate_applications
CREATE POLICY "Users can view their own applications" ON public.affiliate_applications
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own applications" ON public.affiliate_applications
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all applications" ON public.affiliate_applications
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- RLS Policies for affiliates
CREATE POLICY "Affiliates can view their own data" ON public.affiliates
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all affiliates" ON public.affiliates
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- RLS Policies for referrals
CREATE POLICY "Affiliates can view their referrals" ON public.referrals
FOR SELECT USING (
  referrer_id IN (
    SELECT id FROM public.affiliates WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all referrals" ON public.referrals
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- RLS Policies for affiliate_commissions
CREATE POLICY "Affiliates can view their commissions" ON public.affiliate_commissions
FOR SELECT USING (
  affiliate_id IN (
    SELECT id FROM public.affiliates WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all commissions" ON public.affiliate_commissions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- RLS Policies for affiliate_withdrawals
CREATE POLICY "Affiliates can view and create their withdrawals" ON public.affiliate_withdrawals
FOR ALL USING (
  affiliate_id IN (
    SELECT id FROM public.affiliates WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all withdrawals" ON public.affiliate_withdrawals
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Create function to generate unique affiliate code
CREATE OR REPLACE FUNCTION public.generate_affiliate_code(p_full_name text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  base_code text;
  final_code text;
  counter integer := 0;
BEGIN
  -- Create base code from name (first 6 chars of lowercase name without spaces)
  base_code := lower(regexp_replace(p_full_name, '[^a-zA-Z0-9]', '', 'g'));
  base_code := left(base_code, 6);
  
  -- Ensure minimum length
  IF length(base_code) < 3 THEN
    base_code := base_code || 'aff';
  END IF;
  
  final_code := base_code;
  
  -- Check for uniqueness and add number if needed
  WHILE EXISTS (SELECT 1 FROM public.affiliates WHERE affiliate_code = final_code) LOOP
    counter := counter + 1;
    final_code := base_code || counter::text;
  END LOOP;
  
  RETURN final_code;
END;
$$;

-- Create function to track referral signup
CREATE OR REPLACE FUNCTION public.track_referral_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If user was referred and becomes a subscriber, mark as converted
  IF NEW.referrer_id IS NOT NULL AND 
     EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.id AND role = 'subscriber') THEN
    
    UPDATE public.referrals 
    SET is_converted = true, conversion_date = now()
    WHERE referred_user_id = NEW.id AND is_converted = false;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for referral tracking
CREATE TRIGGER track_referral_conversion
  AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.track_referral_signup();

-- Create indexes for performance
CREATE INDEX idx_affiliate_applications_user_id ON public.affiliate_applications(user_id);
CREATE INDEX idx_affiliate_applications_status ON public.affiliate_applications(status);
CREATE INDEX idx_affiliates_user_id ON public.affiliates(user_id);
CREATE INDEX idx_affiliates_code ON public.affiliates(affiliate_code);
CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX idx_referrals_referred ON public.referrals(referred_user_id);
CREATE INDEX idx_affiliate_commissions_affiliate ON public.affiliate_commissions(affiliate_id);
CREATE INDEX idx_affiliate_withdrawals_affiliate ON public.affiliate_withdrawals(affiliate_id);
CREATE INDEX idx_profiles_referrer ON public.profiles(referrer_id);
