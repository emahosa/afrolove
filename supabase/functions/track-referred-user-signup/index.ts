
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

    const { referral_code } = await req.json()

    if (!referral_code) {
      return new Response(JSON.stringify({ message: 'No referral code provided' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Find affiliate by referral code
    const { data: affiliate, error: affiliateError } = await supabaseAdmin
      .from('affiliate_applications')
      .select('user_id, unique_referral_code')
      .eq('unique_referral_code', referral_code)
      .eq('status', 'approved')
      .single()

    if (affiliateError || !affiliate) {
      return new Response(JSON.stringify({ error: 'Invalid referral code' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Update user profile with referrer
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ referrer_id: affiliate.user_id })
      .eq('id', user.id)

    if (profileError) {
      console.error('Error updating profile:', profileError)
    }

    // Create referral record
    const { error: referralError } = await supabaseAdmin
      .from('affiliate_referrals')
      .insert({
        affiliate_id: affiliate.user_id,
        referred_user_id: user.id,
        referral_code: referral_code,
        first_click_date: new Date().toISOString(),
        signup_date: new Date().toISOString()
      })

    if (referralError) {
      console.error('Error creating referral:', referralError)
      return new Response(JSON.stringify({ error: 'Failed to create referral' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    // Update click record to mark as converted
    await supabaseAdmin
      .from('affiliate_clicks')
      .update({ converted_to_signup: true })
      .eq('affiliate_user_id', affiliate.user_id)
      .eq('referral_code', referral_code)
      .order('created_at', { ascending: false })
      .limit(1)

    // Log activity
    await supabaseAdmin
      .from('user_activities')
      .insert({
        user_id: user.id,
        activity_type: 'signup',
        referrer_affiliate_id: affiliate.user_id,
        metadata: { referral_code }
      })

    console.log(`Signup tracked for user ${user.id} referred by ${affiliate.user_id}`)

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Signup tracked successfully' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Error in track-referred-user-signup:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
