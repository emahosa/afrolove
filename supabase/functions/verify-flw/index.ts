import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const FLW_SECRET_KEY = Deno.env.get("FLW_SECRET_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { transaction_id, tx_ref } = await req.json();
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (!transaction_id || !tx_ref) {
      return new Response(JSON.stringify({ error: "Missing transaction_id or tx_ref" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const verifyRes = await fetch(`https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`, {
      method: "GET",
      headers: { Authorization: `Bearer ${FLW_SECRET_KEY}` },
    });
    const result = await verifyRes.json();

    if (result.status !== "success" || result.data.status !== "successful") {
      return new Response(JSON.stringify({ success: false, error: "Transaction not successful", data: result }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (result.data.tx_ref !== tx_ref) {
      return new Response(JSON.stringify({ error: "tx_ref mismatch" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const meta = result.data.meta || result.data.metadata || {};
    const { user_id, type, credits, plan_id, plan_name } = meta;
    if (!user_id) {
      return new Response(JSON.stringify({ error: "Missing user_id in metadata" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: existingTx, error: txCheckError } = await supabaseAdmin
      .from('payment_transactions')
      .select('id')
      .eq('payment_id', result.data.id)
      .single();

    if (txCheckError && txCheckError.code !== 'PGRST116') throw txCheckError;
    if (existingTx) {
      return new Response(JSON.stringify({ success: true, message: "Transaction already processed." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: insertError } = await supabaseAdmin.from('payment_transactions').insert({
      user_id: user_id,
      amount: result.data.amount,
      currency: result.data.currency?.toUpperCase() || 'USD',
      payment_method: 'flutterwave',
      status: 'completed',
      payment_id: result.data.id,
      credits_purchased: parseInt(credits || '0')
    });

    if (insertError) {
      console.error('Error inserting transaction:', insertError);
      throw new Error(`Failed to insert transaction: ${insertError.message}`);
    }

    if (type === 'credits' && credits) {
      const { error } = await supabaseAdmin.rpc('update_user_credits', {
        p_user_id: user_id,
        p_amount: parseInt(credits || '0'),
      });
      if (error) throw new Error(`Failed to update user credits: ${error.message}`);
    } else if (type === 'subscription' && plan_id && plan_name) {
      const subscriptionStartDate = new Date(result.data.created_at);
      const expiresAt = new Date(subscriptionStartDate);
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      await supabaseAdmin
        .from('user_subscriptions')
        .update({ subscription_status: 'inactive', updated_at: new Date().toISOString() })
        .eq('user_id', user_id)
        .eq('subscription_status', 'active');

      const { error } = await supabaseAdmin
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
      if (error) throw new Error(`Failed to update subscription: ${error.message}`);

      if (credits) {
        const { error: creditError } = await supabaseAdmin.rpc('update_user_credits', {
          p_user_id: user_id,
          p_amount: parseInt(credits || '0')
        });
        if (creditError) {
          console.error('Flutterwave verify error: Error adding credits for subscription:', creditError);
          throw new Error(`Failed to update user credits for subscription: ${creditError.message}`);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, data: result.data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error('💥 Flutterwave verify uncaught error:', err);
    return new Response(JSON.stringify({ error: err.message || "Internal Server Error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
