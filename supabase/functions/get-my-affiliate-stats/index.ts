
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const userSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user }, error: userError } = await userSupabaseClient.auth.getUser()

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get affiliate stats from the main affiliates table
    const { data: affiliateData, error: affiliateError } = await supabaseAdmin
      .from('affiliates')
      .select('total_free_referrals, total_subscribers, lifetime_commissions, pending_balance, paid_balance')
      .eq('user_id', user.id)
      .single()

    if (affiliateError) {
      console.error('Error fetching affiliate data:', affiliateError)
      return new Response(JSON.stringify({ error: 'Failed to fetch affiliate stats' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    if (!affiliateData) {
        return new Response(JSON.stringify({ error: 'Affiliate not found' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404,
        });
    }

    // Get total clicks separately
    const { count: clicksCount, error: clicksError } = await supabaseAdmin
      .from('affiliate_clicks')
      .select('id', { count: 'exact' })
      .eq('affiliate_user_id', user.id)

    if (clicksError) {
        console.error('Error fetching clicks count:', clicksError);
        // Decide if you want to fail the whole request or return partial data
    }

    const totalReferrals = (affiliateData.total_free_referrals || 0) + (affiliateData.total_subscribers || 0);
    const conversionRate = (clicksCount ?? 0) > 0 ? (totalReferrals / (clicksCount ?? 0)) * 100 : 0;

    const stats = {
      totalReferrals,
      totalEarnings: parseFloat(affiliateData.lifetime_commissions.toString()),
      pendingBalance: parseFloat(affiliateData.pending_balance.toString()),
      paidBalance: parseFloat(affiliateData.paid_balance.toString()),
      conversionRate: parseFloat(conversionRate.toFixed(2)),
      clicksCount: clicksCount ?? 0,
    }

    return new Response(JSON.stringify(stats), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Error in get-my-affiliate-stats:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
