
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

    const { type, userId, origin } = await req.json()

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (type === 'links') {
      // Get affiliate application data for links
      const { data: affiliateData, error: affiliateError } = await supabaseAdmin
        .from('affiliate_applications')
        .select('unique_referral_code, total_clicks')
        .eq('user_id', userId)
        .eq('status', 'approved')
        .single()

      if (affiliateError || !affiliateData) {
        return new Response(JSON.stringify({ links: [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      }

      // Get actual click count from affiliate_clicks table
      const { data: clicksData } = await supabaseAdmin
        .from('affiliate_clicks')
        .select('id')
        .eq('affiliate_user_id', userId)

      const actualClicksCount = clicksData?.length || 0

      const links = [{
        id: user.id,
        url: `${origin}/?ref=${affiliateData.unique_referral_code}`,
        referral_code: affiliateData.unique_referral_code,
        clicks_count: actualClicksCount,
        created_at: new Date().toISOString()
      }]

      return new Response(JSON.stringify({ links }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    if (type === 'wallet') {
      // Get wallet data from affiliate_wallets
      const { data: walletData } = await supabaseAdmin
        .from('affiliate_wallets')
        .select('*')
        .eq('affiliate_user_id', userId)
        .single()

      // If no wallet exists, create one
      if (!walletData) {
        const { data: newWallet } = await supabaseAdmin
          .from('affiliate_wallets')
          .insert({
            affiliate_user_id: userId,
            pending_balance: 0,
            paid_balance: 0,
            lifetime_earnings: 0
          })
          .select()
          .single()

        return new Response(JSON.stringify({ wallet: newWallet }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      }

      return new Response(JSON.stringify({ wallet: walletData }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    if (type === 'earnings') {
      // Get earnings from affiliate_commissions
      const { data: commissionsData, error: commissionsError } = await supabaseAdmin
        .from('affiliate_commissions')
        .select(`
          id,
          referred_user_id,
          amount_earned,
          created_at,
          subscription_payment_id
        `)
        .eq('affiliate_user_id', userId)
        .order('created_at', { ascending: false })

      const earnings = commissionsData?.map(commission => ({
        id: commission.id,
        referred_user_id: commission.referred_user_id,
        amount_earned: parseFloat(commission.amount_earned.toString()),
        created_at: commission.created_at,
        type: commission.subscription_payment_id.startsWith('free_referral_') ? 'free_referral' : 'subscription',
        status: 'cleared'
      })) || []

      return new Response(JSON.stringify({ earnings }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid type parameter' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })

  } catch (error) {
    console.error('Error in get-affiliate-data:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
