import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const FLW_SECRET_HASH = Deno.env.get("FLW_SECRET_HASH")!;
const FLW_SECRET_KEY = Deno.env.get("FLW_SECRET_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const signature = req.headers.get("verif-hash");
    if (!signature || signature !== FLW_SECRET_HASH) {
      console.error('Flutterwave webhook error: Invalid signature');
      return new Response("Invalid signature", { status: 401, headers: corsHeaders });
    }

    const payload = await req.json();
    console.log('Flutterwave webhook received:', payload);

    if (payload.event === 'charge.completed' && payload.data.status === 'successful') {
      const chargeData = payload.data;
      const { id, amount, currency, metadata } = chargeData;
      const { user_id, type, credits, plan_id, plan_name } = metadata;

      if (!user_id) {
        console.error('Flutterwave webhook error: No user_id in event metadata', metadata);
        return new Response('No user_id in metadata', { status: 400, headers: corsHeaders });
      }

      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      const verifyRes = await fetch(`https://api.flutterwave.com/v3/transactions/${id}/verify`, {
        headers: { Authorization: `Bearer ${FLW_SECRET_KEY}` },
      });
      const verificationData = await verifyRes.json();

      if (verificationData.status !== 'success' || verificationData.data.status !== 'successful') {
        console.warn(`Webhook verification failed for transaction ${id}. Status: ${verificationData.data.status}`);
        return new Response(JSON.stringify({ received: true, message: "Verification failed" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { data: existingTx } = await supabaseAdmin
        .from('payment_transactions')
        .select('id')
        .eq('payment_id', id)
        .single();

      if (existingTx) {
        console.log(`Transaction ${id} already processed.`);
        return new Response(JSON.stringify({ received: true, message: "Already processed" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { error: transactionError } = await supabaseAdmin
        .from('payment_transactions')
        .insert({
          user_id: user_id,
          amount: amount,
          currency: currency?.toUpperCase() || 'USD',
          payment_method: 'flutterwave',
          status: 'completed',
          payment_id: id,
          credits_purchased: parseInt(credits || '0')
        });

      if (transactionError) {
        console.error('Flutterwave webhook error: Error logging transaction:', transactionError);
      }

      if (type === 'credits' && credits) {
        const { error: creditError } = await supabaseAdmin.rpc('update_user_credits', {
          p_user_id: user_id,
          p_amount: parseInt(credits || '0')
        });
        if (creditError) {
          console.error('Flutterwave webhook error: Error updating credits:', creditError);
        }
      }

      if (type === 'subscription' && plan_id && plan_name) {
        const subscriptionStartDate = new Date(chargeData.created_at);
        const expiresAt = new Date(subscriptionStartDate);
        expiresAt.setMonth(expiresAt.getMonth() + 1);

        await supabaseAdmin
          .from('user_subscriptions')
          .update({ subscription_status: 'inactive', updated_at: new Date().toISOString() })
          .eq('user_id', user_id)
          .eq('subscription_status', 'active');

        const { error: subError } = await supabaseAdmin
          .from('user_subscriptions')
          .upsert({
            user_id: user_id,
            subscription_type: plan_id,
            subscription_status: 'active',
            started_at: subscriptionStartDate.toISOString(),
            expires_at: expiresAt.toISOString(),
            updated_at: new Date().toISOString(),
            payment_provider: 'flutterwave'
          }, { onConflict: 'user_id' });

        if (subError) {
          console.error('Flutterwave webhook error: Error upserting subscription:', subError);
        }

        if (credits) {
          const { error: creditError } = await supabaseAdmin.rpc('update_user_credits', {
            p_user_id: user_id,
            p_amount: parseInt(credits || '0')
          });
          if (creditError) {
            console.error('Flutterwave webhook error: Error adding credits for subscription:', creditError);
          }
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err) {
    console.error('💥 Flutterwave webhook uncaught error:', err);
    return new Response(`Webhook error: ${err.message}`, {
      status: 500,
      headers: corsHeaders,
    });
  }
});
