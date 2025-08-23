
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const getSupabaseAdmin = () => {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
}

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

    const supabaseAdmin = getSupabaseAdmin();
    const { ip_address, device_id, referrer_code } = await req.json();

    // Update user profile with IP address and device ID if provided
    if (ip_address || device_id) {
      await supabaseAdmin
        .from('profiles')
        .update({
          ...(ip_address && { ip_address }),
          ...(device_id && { device_id })
        })
        .eq('id', user.id);
    }

    // If there's a referrer code, set up the referral relationship
    if (referrer_code) {
      // Find the affiliate with this referral code
      const { data: affiliate } = await supabaseAdmin
        .from('affiliate_applications')
        .select('user_id')
        .eq('unique_referral_code', referrer_code)
        .eq('status', 'approved')
        .single();

      if (affiliate) {
        // Update the new user's profile with the referrer's user_id
        await supabaseAdmin
          .from('profiles')
          .update({ referrer_id: affiliate.user_id })
          .eq('id', user.id);

        // Create a record in the affiliate_referrals table
        await supabaseAdmin
          .from('affiliate_referrals')
          .insert({
            affiliate_id: affiliate.user_id,
            referred_user_id: user.id,
            referral_code: referrer_code,
            first_click_date: new Date().toISOString(),
            signup_date: new Date().toISOString(),
          });

        // Log the signup activity for analytics
        await supabaseAdmin
          .from('user_activities')
          .insert({
            user_id: user.id,
            activity_type: 'signup',
            referrer_affiliate_id: affiliate.user_id,
            metadata: { ip_address, device_id, referrer_code }
          });
      }
    }

    return new Response(JSON.stringify({ message: 'User registration tracked successfully' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Error tracking user registration:', error)
    return new Response(JSON.stringify({ error: 'An unexpected error occurred' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
