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

    // Get total earnings by calling the new, correct RPC
    const { data: totalEarnings, error: earningsError } = await supabaseClient
      .rpc('get_total_affiliate_commissions', { user_id_param: user.id })

    if (earningsError) {
      console.error('Error fetching total commissions:', earningsError);
      throw earningsError;
    }

    // Clicks and conversion rate are currently placeholders.
    // Click tracking will be implemented in the next step.
    const totalClicks = 0;
    const conversionRate = 0;

    const stats = {
      totalReferrals: referralsCount || 0,
      totalEarnings: totalEarnings || 0,
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
