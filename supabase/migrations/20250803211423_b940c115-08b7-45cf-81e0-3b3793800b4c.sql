
-- Add IP address and device ID tracking to profiles table
ALTER TABLE public.profiles 
ADD COLUMN registration_ip inet,
ADD COLUMN device_id text;

-- Create affiliate_links table for tracking referral links
CREATE TABLE IF NOT EXISTS public.affiliate_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  link_code TEXT UNIQUE NOT NULL,
  clicks_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create affiliate_wallets table for earnings tracking
CREATE TABLE IF NOT EXISTS public.affiliate_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance DECIMAL(10,2) DEFAULT 0,
  total_earned DECIMAL(10,2) DEFAULT 0,
  total_withdrawn DECIMAL(10,2) DEFAULT 0,
  usdt_wallet_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(affiliate_user_id)
);

-- Create affiliate_earnings table for detailed earnings tracking
CREATE TABLE IF NOT EXISTS public.affiliate_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  earning_type TEXT NOT NULL CHECK (earning_type IN ('free_referral', 'subscription_commission')),
  amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid')),
  is_valid BOOLEAN DEFAULT true,
  invalid_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- Create user_activities table for tracking user actions
CREATE TABLE IF NOT EXISTS public.user_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  referrer_affiliate_id UUID REFERENCES public.profiles(id),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add affiliate system settings to system_settings
INSERT INTO public.system_settings (key, value, category, description) 
VALUES 
  ('affiliate_program_enabled', 'true', 'affiliate', 'Enable/disable affiliate program'),
  ('affiliate_free_referral_enabled', 'true', 'affiliate', 'Enable/disable free referral earnings'),
  ('affiliate_subscription_commission_enabled', 'true', 'affiliate', 'Enable/disable subscription commission'),
  ('affiliate_subscription_commission_percent', '10', 'affiliate', 'Subscription commission percentage'),
  ('affiliate_free_referral_compensation', '0.10', 'affiliate', 'Amount earned per free referral')
ON CONFLICT (key) DO NOTHING;

-- Enable RLS on new tables
ALTER TABLE public.affiliate_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;

-- RLS policies for affiliate_links
CREATE POLICY "Affiliates can view their own links"
ON public.affiliate_links FOR SELECT
USING (auth.uid() = affiliate_user_id);

CREATE POLICY "Admins can view all links"
ON public.affiliate_links FOR ALL
USING (has_role('admin'::user_role));

-- RLS policies for affiliate_wallets
CREATE POLICY "Affiliates can view their own wallet"
ON public.affiliate_wallets FOR SELECT
USING (auth.uid() = affiliate_user_id);

CREATE POLICY "Admins can view all wallets"
ON public.affiliate_wallets FOR ALL
USING (has_role('admin'::user_role));

-- RLS policies for affiliate_earnings
CREATE POLICY "Affiliates can view their own earnings"
ON public.affiliate_earnings FOR SELECT
USING (auth.uid() = affiliate_user_id);

CREATE POLICY "Admins can view all earnings"
ON public.affiliate_earnings FOR ALL
USING (has_role('admin'::user_role));

-- RLS policies for user_activities
CREATE POLICY "Users can view their own activities"
ON public.user_activities FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all activities"
ON public.user_activities FOR ALL
USING (has_role('admin'::user_role));

-- Create indexes for performance
CREATE INDEX idx_affiliate_links_affiliate_user_id ON public.affiliate_links(affiliate_user_id);
CREATE INDEX idx_affiliate_wallets_affiliate_user_id ON public.affiliate_wallets(affiliate_user_id);
CREATE INDEX idx_affiliate_earnings_affiliate_user_id ON public.affiliate_earnings(affiliate_user_id);
CREATE INDEX idx_affiliate_earnings_referred_user_id ON public.affiliate_earnings(referred_user_id);
CREATE INDEX idx_user_activities_user_id ON public.user_activities(user_id);
CREATE INDEX idx_profiles_registration_ip ON public.profiles(registration_ip);
CREATE INDEX idx_profiles_device_id ON public.profiles(device_id);

-- Update profiles trigger to capture IP and device ID
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url, credits, registration_ip, device_id)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    5,
    (NEW.raw_user_meta_data->>'registration_ip')::inet,
    NEW.raw_user_meta_data->>'device_id'
  );
  
  -- Set default role as voter
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'voter');
  
  -- Create default subscription record
  INSERT INTO public.user_subscriptions (user_id, subscription_type, subscription_status)
  VALUES (NEW.id, 'free', 'inactive');
  
  RETURN NEW;
END;
$function$;
