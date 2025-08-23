import { serve } from "https://deno.land/std/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';

interface OnSignupPayload {
  user_id: string;
  aff_code: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { user_id, aff_code }: OnSignupPayload = await req.json();

    if (!user_id || !aff_code) {
      return new Response(JSON.stringify({ error: 'user_id and aff_code are required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // 1. Resolve affiliate
    const { data: aff, error: affError } = await supabaseAdmin
      .from('affiliates')
      .select('id')
      .eq('code', aff_code)
      .single();

    if (affError || !aff) {
      // Don't throw an error, just log and exit gracefully
      console.log(`No affiliate found for code: ${aff_code}`);
      return new Response(JSON.stringify({ message: 'no-affiliate' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // 2. Create referral link if not exists (using the RPC function)
    const { error: rpcError } = await supabaseAdmin.rpc('ensure_affiliate_referral', {
      p_affiliate_id: aff.id,
      p_user_id: user_id
    });

    if (rpcError) {
      console.error('Error calling ensure_affiliate_referral RPC:', rpcError);
      throw rpcError;
    }

    // 3. Mark user signup time
    const { error: updateError } = await supabaseAdmin
      .from('auth.users')
      .update({ signup_at: new Date().toISOString() })
      .eq('id', user_id);

    if (updateError) {
      console.error('Error updating user signup_at:', updateError);
      // Don't throw, as the critical step (referral link) is done
    }

    return new Response(JSON.stringify({ message: 'ok' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Unhandled error in affiliate-on-signup:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error', details: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
