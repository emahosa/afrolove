CREATE OR REPLACE FUNCTION get_my_affiliate_dashboard()
RETURNS TABLE (
  code text,
  wallet_trc20_usdt text,
  clicks bigint,
  free_referrals bigint,
  free_earnings_usd numeric,
  commission_earnings_usd numeric,
  total_earnings_usd numeric
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  with my_affiliate as (
    select id from public.affiliates where user_id = auth.uid()
  ),
  clicks as (
    select affiliate_id, count(*) as total_clicks
    from affiliate_clicks
    where affiliate_id = (select id from my_affiliate)
    group by affiliate_id
  ),
  free_ref as (
    select affiliate_id, count(*) as free_referrals, coalesce(sum(amount_usd),0) as free_earnings
    from affiliate_free_referrals
    where affiliate_id = (select id from my_affiliate)
    group by affiliate_id
  ),
  comm as (
    select affiliate_id, coalesce(sum(amount_usd),0) as commission_earnings
    from affiliate_commissions
    where affiliate_id = (select id from my_affiliate)
    and status in ('pending','approved','paid')
    group by affiliate_id
  )
  select a.code,
        a.wallet_trc20_usdt,
        coalesce(c.total_clicks,0)::bigint as clicks,
        coalesce(fr.free_referrals,0)::bigint as free_referrals,
        coalesce(fr.free_earnings,0) as free_earnings_usd,
        coalesce(cm.commission_earnings,0) as commission_earnings_usd,
        (coalesce(fr.free_earnings,0) + coalesce(cm.commission_earnings,0)) as total_earnings_usd
  from affiliates a
  left join clicks c  on c.affiliate_id = a.id
  left join free_ref fr on fr.affiliate_id = a.id
  left join comm cm on cm.affiliate_id = a.id
  where a.user_id = auth.uid();
$$;
