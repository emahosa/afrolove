
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
      throw new Error('Referral code is required.')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find the affiliate user_id from the referral code
    const { data: affiliate, error: findError } = await supabaseClient
      .from('affiliate_applications')
      .select('user_id, id')
      .eq('unique_referral_code', referral_code)
      .eq('status', 'approved')
      .single()

    if (findError || !affiliate) {
      console.warn(`Attempted to track click for invalid or non-approved referral code: ${referral_code}`);
      return new Response(JSON.stringify({ message: 'Ignored.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const affiliateUserId = affiliate.user_id;

    // Get IP address and User-Agent from the request headers
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Insert the click record using admin client
    const { error: insertError } = await supabaseAdmin
      .from('affiliate_clicks')
      .insert({
        affiliate_user_id: affiliateUserId,
        ip_address: ipAddress,
        user_agent: userAgent,
      })

    if (insertError) {
      console.error('Error inserting affiliate click:', insertError);
      // Fail silently to the outside world.
    }

    return new Response(JSON.stringify({ message: 'Click tracked successfully.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
