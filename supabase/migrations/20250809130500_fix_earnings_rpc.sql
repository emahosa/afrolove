-- Drop the old, incorrect function that queries a non-existent table
DROP FUNCTION IF EXISTS public.get_total_affiliate_earnings(user_id_param uuid);

-- Create a new, correct function to calculate total earnings from the 'affiliate_commissions' table
CREATE OR REPLACE FUNCTION public.get_total_affiliate_commissions(user_id_param uuid)
RETURNS numeric
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COALESCE(SUM(amount_earned), 0)
  FROM public.affiliate_commissions
  WHERE affiliate_user_id = user_id_param;
$$;
