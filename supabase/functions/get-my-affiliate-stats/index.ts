import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the user's auth token to get the user ID
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

    // Create an admin client to bypass RLS for stats calculation
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Get total referrals count
    const { count: referralsCount, error: referralsError } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('referrer_id', user.id)
    if (referralsError) throw new Error(`Failed to fetch referrals count: ${referralsError.message}`);

    // 2. Get total earnings
    const { data: commissions, error: earningsError } = await supabaseAdmin
      .from('affiliate_commissions')
      .select('amount_earned')
      .eq('affiliate_user_id', user.id)
    if (earningsError) throw new Error(`Failed to fetch total earnings: ${earningsError.message}`);
    const totalEarnings = commissions?.reduce((sum, record) => sum + Number(record.amount_earned), 0) || 0;

    // 3. Get total clicks
    const { data: clicksData, error: clicksError } = await supabaseAdmin
      .from('affiliate_applications')
      .select('total_clicks')
      .eq('user_id', user.id)
      .single();
    // Do not throw error if no application found, just default to 0 clicks
    const totalClicks = clicksData?.total_clicks || 0;

    // 4. Calculate conversion rate
    const conversionRate = totalClicks > 0 && (referralsCount || 0) > 0
      ? ((referralsCount || 0) / totalClicks) * 100
      : 0;

    const stats = {
      totalReferrals: referralsCount || 0,
      totalEarnings: totalEarnings || 0,
      conversionRate: conversionRate,
      clicksCount: totalClicks,
    };

    return new Response(JSON.stringify(stats), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error in get-my-affiliate-stats:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
