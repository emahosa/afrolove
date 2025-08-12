
-- Create the missing affiliate tables and functions
CREATE TABLE IF NOT EXISTS public.affiliate_links (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_user_id uuid NOT NULL,
  link_code text NOT NULL UNIQUE,
  clicks_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.affiliate_earnings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_user_id uuid NOT NULL,
  referred_user_id uuid NOT NULL,
  earning_type text NOT NULL CHECK (earning_type IN ('free_referral', 'subscription_commission')),
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  processed_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.affiliate_wallets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_user_id uuid NOT NULL UNIQUE,
  balance numeric NOT NULL DEFAULT 0,
  total_earned numeric NOT NULL DEFAULT 0,
  total_withdrawn numeric NOT NULL DEFAULT 0,
  usdt_wallet_address text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_activities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  activity_type text NOT NULL,
  referrer_affiliate_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  metadata jsonb
);

-- Enable RLS on new tables
ALTER TABLE public.affiliate_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;

-- RLS policies for affiliate_links
CREATE POLICY "Affiliates can view their own links" ON public.affiliate_links
  FOR SELECT USING (affiliate_user_id = auth.uid());

CREATE POLICY "Admins can view all affiliate links" ON public.affiliate_links
  FOR ALL USING (has_role('admin'::user_role));

-- RLS policies for affiliate_earnings
CREATE POLICY "Affiliates can view their own earnings" ON public.affiliate_earnings
  FOR SELECT USING (affiliate_user_id = auth.uid());

CREATE POLICY "Admins can view all affiliate earnings" ON public.affiliate_earnings
  FOR ALL USING (has_role('admin'::user_role));

-- RLS policies for affiliate_wallets
CREATE POLICY "Affiliates can view their own wallet" ON public.affiliate_wallets
  FOR SELECT USING (affiliate_user_id = auth.uid());

CREATE POLICY "Affiliates can update their own wallet" ON public.affiliate_wallets
  FOR UPDATE USING (affiliate_user_id = auth.uid());

CREATE POLICY "Admins can view all affiliate wallets" ON public.affiliate_wallets
  FOR ALL USING (has_role('admin'::user_role));

-- RLS policies for user_activities
CREATE POLICY "Users can view their own activities" ON public.user_activities
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all user activities" ON public.user_activities
  FOR ALL USING (has_role('admin'::user_role));

-- Create the missing RPC functions
CREATE OR REPLACE FUNCTION public.get_affiliate_links(user_id uuid)
RETURNS TABLE(
  id uuid,
  affiliate_user_id uuid,
  link_code text,
  clicks_count integer,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    al.id,
    al.affiliate_user_id,
    al.link_code,
    al.clicks_count,
    al.created_at,
    al.updated_at
  FROM public.affiliate_links al
  WHERE al.affiliate_user_id = user_id;
$$;

CREATE OR REPLACE FUNCTION public.get_affiliate_referrals_count(user_id_param uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(*)::integer
  FROM public.profiles
  WHERE referrer_id = user_id_param;
$$;

CREATE OR REPLACE FUNCTION public.get_total_affiliate_earnings(user_id_param uuid)
RETURNS numeric
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(SUM(amount), 0)
  FROM public.affiliate_earnings
  WHERE affiliate_user_id = user_id_param AND status = 'approved';
$$;

CREATE OR REPLACE FUNCTION public.get_affiliate_payout_history(user_id_param uuid)
RETURNS TABLE(
  id uuid,
  requested_amount numeric,
  status text,
  requested_at timestamp with time zone,
  processed_at timestamp with time zone,
  admin_notes text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    apr.id,
    apr.requested_amount,
    apr.status,
    apr.requested_at,
    apr.processed_at,
    apr.admin_notes
  FROM public.affiliate_payout_requests apr
  WHERE apr.affiliate_user_id = user_id_param
  ORDER BY apr.requested_at DESC;
$$;

-- Create affiliate wallet when application is approved
CREATE OR REPLACE FUNCTION public.create_affiliate_wallet_on_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    -- Create affiliate wallet
    INSERT INTO public.affiliate_wallets (affiliate_user_id, usdt_wallet_address)
    VALUES (NEW.user_id, NEW.usdt_wallet_address)
    ON CONFLICT (affiliate_user_id) DO NOTHING;
    
    -- Create affiliate link
    INSERT INTO public.affiliate_links (affiliate_user_id, link_code)
    VALUES (NEW.user_id, NEW.unique_referral_code)
    ON CONFLICT (link_code) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for affiliate approval
DROP TRIGGER IF EXISTS trigger_create_affiliate_wallet ON public.affiliate_applications;
CREATE TRIGGER trigger_create_affiliate_wallet
  AFTER UPDATE ON public.affiliate_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.create_affiliate_wallet_on_approval();
