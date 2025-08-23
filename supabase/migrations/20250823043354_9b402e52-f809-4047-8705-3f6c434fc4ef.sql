
-- Create affiliate_clicks table to track link clicks
CREATE TABLE public.affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ip_address TEXT,
  user_agent TEXT,
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create affiliate_referrals table to track user signups and their referral status
CREATE TABLE public.affiliate_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  first_click_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  signup_date TIMESTAMPTZ,
  free_referral_earned BOOLEAN NOT NULL DEFAULT false,
  subscription_commission_enabled BOOLEAN NOT NULL DEFAULT false,
  subscribed_within_30_days BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(referred_user_id)
);

-- Update affiliate_applications table to include total_clicks tracking
ALTER TABLE public.affiliate_applications 
ADD COLUMN IF NOT EXISTS total_clicks INTEGER NOT NULL DEFAULT 0;

-- Create indexes for performance
CREATE INDEX idx_affiliate_clicks_affiliate_user_id ON public.affiliate_clicks(affiliate_user_id);
CREATE INDEX idx_affiliate_clicks_clicked_at ON public.affiliate_clicks(clicked_at);
CREATE INDEX idx_affiliate_referrals_affiliate_id ON public.affiliate_referrals(affiliate_id);
CREATE INDEX idx_affiliate_referrals_referred_user_id ON public.affiliate_referrals(referred_user_id);
CREATE INDEX idx_affiliate_referrals_first_click_date ON public.affiliate_referrals(first_click_date);

-- Add RLS policies for affiliate_clicks
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates can view their own clicks" ON public.affiliate_clicks
FOR SELECT USING (affiliate_user_id = auth.uid());

CREATE POLICY "Public can insert clicks" ON public.affiliate_clicks
FOR INSERT WITH CHECK (true);

-- Add RLS policies for affiliate_referrals
ALTER TABLE public.affiliate_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates can view their own referrals" ON public.affiliate_referrals
FOR SELECT USING (affiliate_id = auth.uid());

CREATE POLICY "Admins can view all referrals" ON public.affiliate_referrals
FOR ALL USING (has_role('admin'::user_role));

CREATE POLICY "System can manage referrals" ON public.affiliate_referrals
FOR ALL WITH CHECK (true);

-- Create RPC function to process free referral bonus
CREATE OR REPLACE FUNCTION public.process_free_referral_bonus(
  p_affiliate_id UUID,
  p_referred_user_id UUID,
  p_bonus_amount NUMERIC
) RETURNS VOID AS $$
BEGIN
  -- Mark free referral as earned
  UPDATE public.affiliate_referrals
  SET free_referral_earned = true, updated_at = now()
  WHERE affiliate_id = p_affiliate_id AND referred_user_id = p_referred_user_id;
  
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

-- Create RPC function to process subscription commission
CREATE OR REPLACE FUNCTION public.process_subscription_commission(
  p_affiliate_id UUID,
  p_is_first_payment BOOLEAN,
  p_commission_amount NUMERIC
) RETURNS VOID AS $$
DECLARE
  v_referred_user_id UUID;
BEGIN
  -- Get the referred user ID from referrals table
  SELECT referred_user_id INTO v_referred_user_id
  FROM public.affiliate_referrals
  WHERE affiliate_id = p_affiliate_id AND subscription_commission_enabled = true
  LIMIT 1;
  
  IF v_referred_user_id IS NOT NULL THEN
    -- Add commission record
    INSERT INTO public.affiliate_commissions (
      affiliate_user_id,
      referred_user_id,
      subscription_payment_id,
      amount_earned,
      commission_month
    ) VALUES (
      p_affiliate_id,
      v_referred_user_id,
      'subscription_' || gen_random_uuid()::text,
      p_commission_amount,
      date_trunc('month', now())::date
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update affiliate_applications total_clicks
CREATE OR REPLACE FUNCTION public.update_affiliate_clicks_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.affiliate_applications
  SET total_clicks = total_clicks + 1
  WHERE user_id = NEW.affiliate_user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_clicks_count_trigger
  AFTER INSERT ON public.affiliate_clicks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_affiliate_clicks_count();
