import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const FLW_SECRET_HASH = Deno.env.get("FLW_SECRET_HASH")!;
const FLW_SECRET_KEY = Deno.env.get("FLW_SECRET_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  try {
    // 1. Verify the secret hash
    const signature = req.headers.get("verif-hash");
    if (!signature || signature !== FLW_SECRET_HASH) {
      return new Response("Invalid signature", { status: 401 });
    }

    const payload = await req.json();

    // It's good practice to log the event
    console.log('Flutterwave webhook received:', payload);

    // 2. Check event type and status
    if (payload.event === 'charge.completed' && payload.data.status === 'successful') {
      const { id, tx_ref, amount, currency, meta } = payload.data;
      const { user_id, credits, type, plan_id } = meta;

      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // 3. Verify transaction with Flutterwave API to be extra sure
      const verifyRes = await fetch(`https://api.flutterwave.com/v3/transactions/${id}/verify`, {
        headers: { Authorization: `Bearer ${FLW_SECRET_KEY}` },
      });
      const verificationData = await verifyRes.json();

      if (verificationData.status !== 'success' || verificationData.data.status !== 'successful') {
        console.warn(`Webhook verification failed for transaction ${id}. Status: ${verificationData.data.status}`);
        // Respond 200 so Flutterwave doesn't retry a failed transaction
        return new Response(JSON.stringify({ received: true, message: "Verification failed" }), { headers: { "Content-Type": "application/json" } });
      }

      // 4. Check if transaction has already been processed
      const { data: existingTx } = await supabaseAdmin
        .from('transactions')
        .select('id')
        .eq('transaction_id', id)
        .single();

      if (existingTx) {
        console.log(`Transaction ${id} already processed.`);
        return new Response(JSON.stringify({ received: true, message: "Already processed" }), { headers: { "Content-Type": "application/json" } });
      }

      // 5. Record the transaction
      await supabaseAdmin.from('transactions').insert({
        user_id,
        transaction_id: id,
        gateway: 'flutterwave',
        amount,
        currency,
        status: 'success',
        metadata: payload.data,
      });

      // 6. Give value to the user
      if (type === 'credits') {
        const { error: creditError } = await supabaseAdmin.rpc('update_user_credits', {
          p_user_id: user_id,
          p_amount: credits,
        });

        if (creditError) {
          console.error(`Credit update failed for user ${user_id}:`, creditError);
        }
      } else if (type === 'subscription') {
        // Use upsert to handle both new and existing subscriptions
        const { error: subError } = await supabaseAdmin
          .from('subscriptions')
          .upsert({
            user_id: user_id,
            status: 'active',
            plan_id: plan_id,
            gateway: 'flutterwave',
            gateway_subscription_id: `flw_${id}`
          }, { onConflict: 'user_id' });

        if (subError) {
          console.error(`Subscription update/insert failed for user ${user_id}:`, subError);
        }
      }
    }

    // Respond 200 to acknowledge receipt of the event
    return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });

  } catch (err) {
    console.error('Error in Flutterwave webhook handler:', err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
