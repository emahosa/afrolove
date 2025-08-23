
-- First, let's create the missing affiliate tracking tables

-- Create affiliate_wallets table with proper structure
CREATE TABLE IF NOT EXISTS public.affiliate_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  usdt_wallet_address TEXT,
  pending_balance NUMERIC(10,2) NOT NULL DEFAULT 0,
  paid_balance NUMERIC(10,2) NOT NULL DEFAULT 0,
  lifetime_earnings NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(affiliate_user_id)
);

-- Create user_activities table for comprehensive tracking
CREATE TABLE IF NOT EXISTS public.user_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  referrer_affiliate_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  metadata JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Update affiliate_clicks table structure
ALTER TABLE public.affiliate_clicks 
ADD COLUMN IF NOT EXISTS referral_code TEXT,
ADD COLUMN IF NOT EXISTS converted_to_signup BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS converted_to_subscription BOOLEAN DEFAULT FALSE;

-- Update affiliate_referrals table to match the expected structure
ALTER TABLE public.affiliate_referrals 
ADD COLUMN IF NOT EXISTS commission_earned NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS free_referral_earned_amount NUMERIC(10,2) DEFAULT 0;

-- Create system_settings table for configuration
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default affiliate settings
INSERT INTO public.system_settings (key, value, description) VALUES
('affiliate_free_referral_compensation', '0.10', 'Amount paid for free referral bonus'),
('affiliate_subscription_commission_percent', '10', 'Percentage commission on subscriptions'),
('affiliate_free_referral_cookie_days', '5', 'Days for free referral cookie duration'),
('affiliate_paid_commission_cookie_days', '30', 'Days for paid commission cookie duration')
ON CONFLICT (key) DO NOTHING;

-- Enable RLS on new tables
ALTER TABLE public.affiliate_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for affiliate_wallets
CREATE POLICY "Affiliates can view their own wallet" ON public.affiliate_wallets
  FOR SELECT USING (affiliate_user_id = auth.uid());
  
CREATE POLICY "Affiliates can update their own wallet" ON public.affiliate_wallets
  FOR UPDATE USING (affiliate_user_id = auth.uid());
  
CREATE POLICY "System can manage wallets" ON public.affiliate_wallets
  FOR ALL USING (true) WITH CHECK (true);

-- RLS policies for user_activities
CREATE POLICY "Users can view their own activities" ON public.user_activities
  FOR SELECT USING (user_id = auth.uid());
  
CREATE POLICY "System can manage activities" ON public.user_activities
  FOR ALL USING (true) WITH CHECK (true);

-- RLS policies for system_settings
CREATE POLICY "Anyone can read settings" ON public.system_settings
  FOR SELECT USING (true);
  
CREATE POLICY "Admins can manage settings" ON public.system_settings
  FOR ALL USING (has_role('admin'::user_role));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_affiliate_user_id ON public.affiliate_clicks(affiliate_user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_referral_code ON public.affiliate_clicks(referral_code);
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON public.user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_referrer_affiliate_id ON public.user_activities(referrer_affiliate_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_activity_type ON public.user_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_affiliate_id ON public.affiliate_referrals(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_referred_user_id ON public.affiliate_referrals(referred_user_id);

-- Update triggers for affiliate_clicks to increment total_clicks
CREATE OR REPLACE FUNCTION public.update_affiliate_clicks_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.affiliate_applications
  SET total_clicks = total_clicks + 1
  WHERE user_id = NEW.affiliate_user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for affiliate clicks
DROP TRIGGER IF EXISTS update_affiliate_clicks_trigger ON public.affiliate_clicks;
CREATE TRIGGER update_affiliate_clicks_trigger
  AFTER INSERT ON public.affiliate_clicks
  FOR EACH ROW EXECUTE FUNCTION public.update_affiliate_clicks_count();

-- Create function to process free referral bonus
CREATE OR REPLACE FUNCTION public.process_free_referral_bonus(
  p_affiliate_id UUID,
  p_referred_user_id UUID,
  p_bonus_amount NUMERIC
) RETURNS VOID AS $$
BEGIN
  -- Mark free referral as earned in affiliate_referrals
  UPDATE public.affiliate_referrals
  SET 
    free_referral_earned = true,
    free_referral_earned_amount = p_bonus_amount,
    updated_at = now()
  WHERE affiliate_id = p_affiliate_id AND referred_user_id = p_referred_user_id;
  
  -- Add to affiliate wallet
  INSERT INTO public.affiliate_wallets (affiliate_user_id, pending_balance, lifetime_earnings)
  VALUES (p_affiliate_id, p_bonus_amount, p_bonus_amount)
  ON CONFLICT (affiliate_user_id) 
  DO UPDATE SET 
    pending_balance = affiliate_wallets.pending_balance + p_bonus_amount,
    lifetime_earnings = affiliate_wallets.lifetime_earnings + p_bonus_amount,
    updated_at = now();
    
  -- Add commission record
  INSERT INTO public.affiliate_commissions (
    affiliate_user_id,
    referred_user_id,
    subscription_payment_id,
    amount_earned,
    commission_month
  ) VALUES (
    p_affiliate_id,
    p_referred_user_id,
    'free_referral_' || gen_random_uuid()::text,
    p_bonus_amount,
    date_trunc('month', now())::date
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to process subscription commission
CREATE OR REPLACE FUNCTION public.process_subscription_commission(
  p_affiliate_id UUID,
  p_referred_user_id UUID,
  p_commission_amount NUMERIC
) RETURNS VOID AS $$
BEGIN
  -- Update referral record
  UPDATE public.affiliate_referrals
  SET 
    commission_earned = commission_earned + p_commission_amount,
    updated_at = now()
  WHERE affiliate_id = p_affiliate_id AND referred_user_id = p_referred_user_id;
  
  -- Add to affiliate wallet
  INSERT INTO public.affiliate_wallets (affiliate_user_id, pending_balance, lifetime_earnings)
  VALUES (p_affiliate_id, p_commission_amount, p_commission_amount)
  ON CONFLICT (affiliate_user_id) 
  DO UPDATE SET 
    pending_balance = affiliate_wallets.pending_balance + p_commission_amount,
    lifetime_earnings = affiliate_wallets.lifetime_earnings + p_commission_amount,
    updated_at = now();
    
  -- Add commission record
  INSERT INTO public.affiliate_commissions (
    affiliate_user_id,
    referred_user_id,
    subscription_payment_id,
    amount_earned,
    commission_month
  ) VALUES (
    p_affiliate_id,
    p_referred_user_id,
    'subscription_' || gen_random_uuid()::text,
    p_commission_amount,
    date_trunc('month', now())::date
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
