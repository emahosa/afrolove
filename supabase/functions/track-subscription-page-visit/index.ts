
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

    // Check if this user was referred
    const { data: referral, error: referralError } = await supabaseAdmin
      .from('affiliate_referrals')
      .select('*')
      .eq('referred_user_id', user.id)
      .single()

    if (referralError || !referral) {
      return new Response(JSON.stringify({ message: 'User was not referred' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Check if free referral bonus already earned
    if (referral.free_referral_earned) {
      return new Response(JSON.stringify({ message: 'Free referral bonus already earned' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Check if within 5-day window
    const fiveDaysAgo = new Date()
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5)
    const signupDate = new Date(referral.signup_date || referral.first_click_date)

    if (signupDate < fiveDaysAgo) {
      return new Response(JSON.stringify({ message: 'Free referral period expired (more than 5 days)' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Get free referral compensation amount
    const { data: settings } = await supabaseAdmin
      .from('system_settings')
      .select('value')
      .eq('key', 'affiliate_free_referral_compensation')
      .single()

    const bonusAmount = settings ? parseFloat(settings.value) : 0.10

    // Process free referral bonus
    const { error: bonusError } = await supabaseAdmin.rpc('process_free_referral_bonus', {
      p_affiliate_id: referral.affiliate_id,
      p_referred_user_id: user.id,
      p_bonus_amount: bonusAmount
    })

    if (bonusError) {
      console.error('Error processing free referral bonus:', bonusError)
      return new Response(JSON.stringify({ error: 'Failed to process free referral bonus' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    // Log activity
    await supabaseAdmin
      .from('user_activities')
      .insert({
        user_id: user.id,
        activity_type: 'subscription_page_visit',
        referrer_affiliate_id: referral.affiliate_id,
        metadata: { bonus_amount: bonusAmount }
      })

    console.log(`Free referral bonus of $${bonusAmount} processed for affiliate ${referral.affiliate_id}`)

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Free referral bonus processed successfully',
      bonus_amount: bonusAmount
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Error in track-subscription-page-visit:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
