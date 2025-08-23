
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
    );

    // Get total clicks
    const { data: clicksData, error: clicksError } = await supabaseAdmin
      .from('affiliate_clicks')
      .select('id')
      .eq('affiliate_user_id', user.id);

    const clicksCount = clicksData?.length || 0;

    // Get total referrals
    const { data: referralsData, error: referralsError } = await supabaseAdmin
      .from('affiliate_referrals')
      .select('id')
      .eq('affiliate_id', user.id);

    const totalReferrals = referralsData?.length || 0;

    // Get total earnings from commissions
    const { data: commissionsData, error: commissionsError } = await supabaseAdmin
      .from('affiliate_commissions')
      .select('amount_earned')
      .eq('affiliate_user_id', user.id);

    const totalEarnings = commissionsData?.reduce((sum, commission) => 
      sum + parseFloat(commission.amount_earned.toString()), 0) || 0;

    // Calculate conversion rate
    const conversionRate = clicksCount > 0 ? (totalReferrals / clicksCount) * 100 : 0;

    const stats = {
      totalReferrals,
      totalEarnings: parseFloat(totalEarnings.toFixed(2)),
      conversionRate: parseFloat(conversionRate.toFixed(2)),
      clicksCount,
    };

    return new Response(JSON.stringify(stats), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in get-my-affiliate-stats:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
