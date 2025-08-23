import { serve } from "https://deno.land/std/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';

interface SubscribeIntentPayload {
  user_id: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { user_id }: SubscribeIntentPayload = await req.json();

    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Find the first-touch referral record for this user
    const { data: ref, error: refError } = await supabaseAdmin
      .from('affiliate_referrals')
      .select('affiliate_id, user_id')
      .eq('user_id', user_id)
      .order('first_seen_at', { ascending: true })
      .limit(1)
      .single();

    if (refError || !ref) {
      console.log(`No referral found for user: ${user_id}`);
      return new Response(JSON.stringify({ message: 'no-referral' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Insert the free referral reward.
    // The unique constraint on (affiliate_id, user_id) will prevent duplicates.
    const { error: insertError } = await supabaseAdmin.from('affiliate_free_referrals').insert({
      affiliate_id: ref.affiliate_id,
      user_id: ref.user_id, // Use the user_id from the ref for consistency
    });

    // If there's an error, but it's a unique constraint violation (23505), it's okay.
    // This means the user has already been credited.
    if (insertError && insertError.code !== '23505') {
      console.error('Error inserting free referral reward:', insertError);
      throw insertError;
    }

    if (insertError && insertError.code === '23505') {
      console.log(`User ${user_id} has already received a free referral credit.`);
    }

    return new Response(JSON.stringify({ message: 'ok' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Unhandled error in affiliate-subscribe-intent:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error', details: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
