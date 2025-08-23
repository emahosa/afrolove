
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

    const { 
      full_name, 
      email, 
      phone, 
      social_media_url, 
      reason_to_join, 
      usdt_wallet_address 
    } = await req.json()

    console.log('Submitting affiliate application for user:', user.id)

    // Generate unique referral code
    const generateReferralCode = (name: string) => {
      const clean = name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const timestamp = Date.now().toString().slice(-4);
      return `${clean.slice(0, 6)}${timestamp}`;
    };

    const referralCode = generateReferralCode(full_name);

    // Check if user already has an application
    const { data: existingApp, error: checkError } = await supabaseAdmin
      .from('affiliate_applications')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing application:', checkError)
      return new Response(JSON.stringify({ error: 'Database error' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    if (existingApp) {
      return new Response(JSON.stringify({ error: 'You already have an affiliate application' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Insert new application
    const { data: application, error: insertError } = await supabaseAdmin
      .from('affiliate_applications')
      .insert({
        user_id: user.id,
        full_name,
        email,
        phone,
        social_media_url: social_media_url || '',
        reason_to_join,
        usdt_wallet_address,
        unique_referral_code: referralCode,
        status: 'pending'
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting application:', insertError)
      return new Response(JSON.stringify({ error: 'Failed to submit application', details: insertError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    console.log('Application submitted successfully:', application.id)

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Application submitted successfully',
      application 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Error in submit-affiliate-application:', error)
    return new Response(JSON.stringify({ error: 'Internal server error', details: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
