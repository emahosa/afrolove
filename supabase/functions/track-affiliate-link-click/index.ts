
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { referral_code } = await req.json()
    
    if (!referral_code) {
      return new Response(JSON.stringify({ error: 'Referral code is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
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
      console.log('Invalid referral code:', referral_code)
      return new Response(JSON.stringify({ error: 'Invalid referral code' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Get IP and user agent from headers
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'

    // Log the click
    const { error: clickError } = await supabaseAdmin
      .from('affiliate_clicks')
      .insert({
        affiliate_user_id: affiliate.user_id,
        referral_code: referral_code,
        ip_address: ipAddress,
        user_agent: userAgent
      })

    if (clickError) {
      console.error('Error logging click:', clickError)
      return new Response(JSON.stringify({ error: 'Failed to log click' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    console.log(`Click tracked for affiliate ${affiliate.user_id} with code ${referral_code}`)
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Click tracked successfully' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Error in track-affiliate-link-click:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
