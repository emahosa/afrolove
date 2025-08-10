CREATE OR REPLACE FUNCTION public.process_free_referral_bonus(
  p_affiliate_id UUID,
  p_referred_user_id UUID,
  p_bonus_amount DECIMAL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert a record of the earning
  INSERT INTO public.affiliate_earnings (affiliate_id, type, amount, status)
  VALUES (p_affiliate_id, 'free_referral', p_bonus_amount, 'pending');

  -- Mark the bonus as earned for this referral
  UPDATE public.affiliate_referrals
  SET free_referral_earned = TRUE
  WHERE referred_user_id = p_referred_user_id;

  -- Update the affiliate's main stats and balance
  UPDATE public.affiliates
  SET
    total_free_referrals = total_free_referrals + 1,
    pending_balance = pending_balance + p_bonus_amount
  WHERE id = p_affiliate_id;
END;
$$;
