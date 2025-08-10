import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const FREE_REFERRAL_BONUS = 0.10;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // This function should be called by an authenticated user who was referred.
    const userSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user } } = await userSupabaseClient.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const referredUserId = user.id;

    // 1. Find the referral record for this user.
    const { data: referral, error: referralError } = await supabaseAdmin
      .from('affiliate_referrals')
      .select('*')
      .eq('referred_user_id', referredUserId)
      .single();

    if (referralError || !referral) {
      // This user was not referred, or record not found. Do nothing.
      return new Response(JSON.stringify({ message: 'No referral record found for user.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // 2. Check if the free referral bonus has already been earned.
    if (referral.free_referral_earned) {
      return new Response(JSON.stringify({ message: 'Free referral bonus already earned.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const affiliateId = referral.affiliate_id;

    // 3. Use a transaction to perform all database operations.
    const { error: transactionError } = await supabaseAdmin.rpc('process_free_referral_bonus', {
      p_affiliate_id: affiliateId,
      p_referred_user_id: referredUserId,
      p_bonus_amount: FREE_REFERRAL_BONUS
    });

    if (transactionError) {
      throw new Error(`Transaction failed: ${transactionError.message}`);
    }

    return new Response(JSON.stringify({ message: 'Free referral bonus processed successfully.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in log-free-referral-bonus:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
