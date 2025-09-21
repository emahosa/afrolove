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

    // 1. Call flutterwave verify endpoint
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

    // 2. Validate tx_ref
    if (result.data.tx_ref !== tx_ref) {
      return new Response(JSON.stringify({ error: "tx_ref mismatch" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 3. Extract metadata and user ID
    const { user_id, credits, type, plan_id, plan_name } = result.data.meta;

    // Check if transaction has already been processed
    const { data: existingTx, error: txCheckError } = await supabaseAdmin
      .from('transactions')
      .select('id')
      .eq('transaction_id', result.data.id)
      .single();

    if (txCheckError && txCheckError.code !== 'PGRST116') throw txCheckError;
    if (existingTx) {
      return new Response(JSON.stringify({ success: true, message: "Transaction already processed." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Record the transaction
    const { error: insertError } = await supabaseAdmin.from('transactions').insert({
      user_id,
      transaction_id: result.data.id,
      gateway: 'flutterwave',
      amount: result.data.amount,
      currency: result.data.currency,
      status: 'success',
      metadata: result.data,
    });

    if (insertError) {
      console.error('Error inserting transaction:', insertError);
      // Don't block user value for this, but log it.
    }

    // 5. Give value to the user
    if (type === 'credits') {
      const { error } = await supabaseAdmin.rpc('update_user_credits', {
        p_user_id: user_id,
        p_amount: credits,
      });
      if (error) throw new Error(`Failed to update user credits: ${error.message}`);
    } else if (type === 'subscription') {
      // Logic to update subscription status
      const { error } = await supabaseAdmin
        .from('subscriptions')
        .upsert({
          user_id: user_id,
          status: 'active',
          plan_id: plan_id,
          gateway: 'flutterwave',
          gateway_subscription_id: `flw_${result.data.id}`
        }, { onConflict: 'user_id' });
      if (error) throw new Error(`Failed to update subscription: ${error.message}`);
    }

    return new Response(JSON.stringify({ success: true, data: result.data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message || "Internal Server Error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
