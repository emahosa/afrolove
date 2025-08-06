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
    const { data: referralsCount, error: referralsError } = await supabaseClient
      .rpc('get_affiliate_referrals_count', { user_id_param: user.id })

    if (referralsError) {
      console.error('Error fetching referrals count:', referralsError);
      throw referralsError;
    }
    console.log('Referrals count:', referralsCount);

    // Get total earnings
    const { data: totalEarnings, error: earningsError } = await supabaseClient
      .rpc('get_total_affiliate_earnings', { user_id_param: user.id })

    if (earningsError) {
      console.error('Error fetching earnings:', earningsError);
      throw earningsError;
    }
    console.log('Earnings:', totalEarnings);

    // Get click stats
    const { data: links, error: linksError } = await supabaseClient
      .rpc('get_affiliate_links', { user_id: user.id })

    if (linksError) {
      console.error('Error fetching links:', linksError);
      throw linksError;
    }
    console.log('Links:', links);

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
