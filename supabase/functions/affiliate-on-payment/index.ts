import { serve } from "https://deno.land/std/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';

interface PaymentPayload {
  payment_id: string; // Should be UUID
  user_id: string; // Should be UUID
  amount_usd: number;
  status: 'succeeded' | 'failed' | 'refunded';
  paid_at: string; // ISO 8601 timestamp
  provider: string;
}

const COMMISSION_RATE = 0.10; // 10%
const LOCKIN_WINDOW_DAYS = 30;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: PaymentPayload = await req.json();

    // Only process successful payments
    if (payload.status !== 'succeeded') {
      return new Response(JSON.stringify({ message: `Payment status is '${payload.status}', ignored.` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // 1. Upsert payment record
    const { error: paymentError } = await supabaseAdmin.from('payments').upsert({
      id: payload.payment_id,
      user_id: payload.user_id,
      amount_usd: payload.amount_usd,
      status: payload.status,
      paid_at: payload.paid_at,
      provider: payload.provider,
    });

    if (paymentError) {
      console.error('Error upserting payment:', paymentError);
      throw new Error(`Failed to upsert payment record: ${paymentError.message}`);
    }

    // 2. Find affiliate to credit
    const { data: userRow, error: userError } = await supabaseAdmin
      .from('users') // Querying 'users' view in 'auth' schema
      .select('id, affiliate_lockin_id, affiliate_lockin_at, signup_at')
      .eq('id', payload.user_id)
      .single();

    if (userError) {
        console.error('Error fetching user data:', userError);
        throw new Error(`Could not find user ${payload.user_id}: ${userError.message}`);
    }

    let affiliateId: string | null = userRow?.affiliate_lockin_id ?? null;

    // If affiliate is not already locked in, try to find a first-touch referral
    if (!affiliateId) {
      const { data: ref, error: refError } = await supabaseAdmin
        .from('affiliate_referrals')
        .select('affiliate_id')
        .eq('user_id', payload.user_id)
        .order('first_seen_at', { ascending: true })
        .limit(1)
        .single();

      if (refError || !ref) {
        return new Response(JSON.stringify({ message: 'No affiliate referral found for this user.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      // 3. Enforce 30-day window for initial commission and lock-in
      const signupAt = userRow.signup_at ? new Date(userRow.signup_at) : new Date(); // Fallback to now if signup_at is null
      const paidAt = new Date(payload.paid_at);
      const daysSinceSignup = (paidAt.getTime() - signupAt.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceSignup > LOCKIN_WINDOW_DAYS) {
        return new Response(JSON.stringify({ message: `Payment is outside the ${LOCKIN_WINDOW_DAYS}-day lock-in window.` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      affiliateId = ref.affiliate_id;

      // Lock-in this affiliate for all future commissions from this user
      const { error: lockinError } = await supabaseAdmin
        .from('users')
        .update({
          affiliate_lockin_id: affiliateId,
          affiliate_lockin_at: new Date().toISOString(),
        })
        .eq('id', payload.user_id);

      if (lockinError) {
        // Log the error but continue, as creating the commission is more important
        console.error('Failed to lock-in affiliate:', lockinError);
      }
    }

    if (!affiliateId) {
       return new Response(JSON.stringify({ message: 'Could not determine affiliate to credit.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
    }

    // 4. Create the commission record
    const commissionAmount = Number((payload.amount_usd * COMMISSION_RATE).toFixed(2));
    const { error: commissionError } = await supabaseAdmin.from('affiliate_commissions').insert({
      affiliate_id: affiliateId,
      user_id: payload.user_id,
      payment_id: payload.payment_id,
      rate: COMMISSION_RATE,
      amount_usd: commissionAmount,
      status: 'pending',
    });

    if (commissionError) {
      console.error('Error creating commission record:', commissionError);
      throw new Error(`Failed to create commission: ${commissionError.message}`);
    }

    return new Response(JSON.stringify({ message: 'ok', commission_created: true, amount: commissionAmount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Unhandled error in affiliate-on-payment:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error', details: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
