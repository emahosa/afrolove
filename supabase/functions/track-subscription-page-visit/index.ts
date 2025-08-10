import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BONUS_AMOUNT = 0.10;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

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

    // 1. Find the referral record for this user.
    const { data: referral, error: referralError } = await supabaseAdmin
      .from('affiliate_referrals')
      .select('*')
      .eq('referred_user_id', user.id)
      .single();

    if (referralError || !referral) {
      // Not a referred user, so we don't do anything.
      return new Response(JSON.stringify({ message: 'Not a referred user.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // 2. Check if the bonus has already been earned.
    if (referral.free_referral_earned) {
      return new Response(JSON.stringify({ message: 'Bonus already earned for this referral.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // 3. Award the bonus by calling the RPC function.
    const { error: rpcError } = await supabaseAdmin.rpc('process_free_referral_bonus', {
      p_affiliate_id: referral.affiliate_id,
      p_referred_user_id: user.id,
      p_bonus_amount: BONUS_AMOUNT
    });

    if (rpcError) {
      console.error('Error calling process_free_referral_bonus RPC:', rpcError);
      throw new Error('Failed to process free referral bonus.');
    }

    return new Response(JSON.stringify({ message: 'Free referral bonus processed successfully.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in track-subscription-page-visit:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
