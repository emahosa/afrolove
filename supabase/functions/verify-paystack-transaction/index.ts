import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  console.log("🔎 Incoming request:", {
    method: req.method,
    origin: req.headers.get("origin"),
    host: req.headers.get("host"),
    path: new URL(req.url).pathname,
  });

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { reference, type, credits, planId } = await req.json();
    if (!reference || !type) {
      throw new Error('Missing required fields: reference and type are required.');
    }

    const secretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!secretKey) {
      throw new Error('Paystack secret key is not set in environment variables.');
    }

    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to verify transaction with Paystack.');
    }

    const verificationData = await response.json();

    if (!verificationData.status || verificationData.data.status !== 'success') {
      throw new Error('Transaction was not successful.');
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: existingTx, error: txCheckError } = await supabaseAdmin
      .from('transactions')
      .select('id')
      .eq('reference', reference)
      .single();

    if (txCheckError && txCheckError.code !== 'PGRST116') throw txCheckError;
    if (existingTx) {
      return new Response(JSON.stringify({ success: true, message: 'Transaction already processed.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const userId = verificationData.data.metadata?.user_id;
    if (!userId) {
      throw new Error('User ID not found in transaction metadata.');
    }

    if (type === 'credits') {
      if (!credits) throw new Error('Credits amount is required for credit purchases.');

      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('credits')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      const newCredits = (profile.credits || 0) + credits;
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ credits: newCredits })
        .eq('id', userId);

      if (updateError) throw updateError;

    } else if (type === 'subscription') {
      if (!planId) throw new Error('Plan ID is required for subscriptions.');

      const subscriptionCode = verificationData.data.subscription_code;
      const customerCode = verificationData.data.customer.customer_code;

      const { error: subError } = await supabaseAdmin
        .from('user_subscriptions')
        .upsert({
          user_id: userId,
          plan_id: planId,
          status: 'active',
          paystack_subscription_code: subscriptionCode,
          paystack_customer_code: customerCode,
        }, { onConflict: 'user_id' });

      if (subError) throw subError;
    }

    await supabaseAdmin.from('transactions').insert({
      reference: reference,
      provider: 'paystack',
      user_id: userId,
      metadata: verificationData.data,
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error verifying Paystack transaction:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
