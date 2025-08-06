import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    // Get total referrals
    const { count: referralsCount, error: referralsError } = await supabaseClient
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('referrer_id', user.id);

    if (referralsError) throw referralsError;

    // Get total earnings
    const { data: earnings, error: earningsError } = await supabaseClient
      .from('affiliate_earnings')
      .select('amount')
      .eq('affiliate_user_id', user.id);

    if (earningsError) throw earningsError;

    // Get click stats
    const { data: links, error: linksError } = await supabaseClient
      .from('affiliate_links')
      .select('clicks_count')
      .eq('affiliate_user_id', user.id);

    if (linksError) throw linksError;

    const totalEarnings = earnings?.reduce((sum, earning) => sum + Number(earning.amount), 0) || 0;
    const totalClicks = links?.reduce((sum, link) => sum + link.clicks_count, 0) || 0;
    const conversionRate = totalClicks > 0 ? ((referralsCount || 0) / totalClicks) * 100 : 0;

    const stats = {
      totalReferrals: referralsCount || 0,
      totalEarnings,
      conversionRate,
      clicksCount: totalClicks,
    };

    return new Response(JSON.stringify(stats), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
