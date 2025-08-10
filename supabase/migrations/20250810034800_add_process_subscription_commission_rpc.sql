CREATE OR REPLACE FUNCTION public.process_subscription_commission(
  p_affiliate_id UUID,
  p_is_first_payment BOOLEAN,
  p_commission_amount DECIMAL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert a record of the earning
  INSERT INTO public.affiliate_earnings (affiliate_id, type, amount, status)
  VALUES (p_affiliate_id, 'subscription', p_commission_amount, 'pending');

  -- Update the affiliate's main stats and balance
  UPDATE public.affiliates
  SET
    total_subscribers = CASE WHEN p_is_first_payment THEN total_subscribers + 1 ELSE total_subscribers END,
    pending_balance = pending_balance + p_commission_amount,
    lifetime_commissions = lifetime_commissions + p_commission_amount
  WHERE id = p_affiliate_id;
END;
$$;
