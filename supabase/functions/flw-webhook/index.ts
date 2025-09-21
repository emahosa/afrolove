import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// Initialize constants from environment variables
const FLW_SECRET_HASH = Deno.env.get("FLW_SECRET_HASH");
const FLW_SECRET_KEY = Deno.env.get("FLW_SECRET_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// Validate environment variables
if (!FLW_SECRET_HASH || !FLW_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("CRITICAL: Missing required environment variables for Flutterwave webhook.");
  // Using Deno.exit() might not be ideal in all serverless environments,
  // but it ensures the function doesn't run with a bad configuration.
  Deno.exit(1);
}

// Create a single Supabase client instance for the service role
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Main request handler
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Verify webhook signature for security
    const signature = req.headers.get("verif-hash");
    if (!signature || signature !== FLW_SECRET_HASH) {
      console.error('Webhook Error: Invalid signature received.');
      return new Response("Invalid signature", { status: 401, headers: corsHeaders });
    }

    // 2. Parse the incoming payload from Flutterwave
    const payload = await req.json();
    console.log(`Webhook received event: ${payload.event}`);

    // 3. Process only successful, completed charges
    if (payload.event === 'charge.completed' && payload.data.status === 'successful') {
      await handleSuccessfulCharge(payload.data);
    } else {
      console.log(`Ignoring event '${payload.event}' with status '${payload.data?.status}'.`);
    }

    // 4. Return a success response to Flutterwave
    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err) {
    console.error(`Unhandled Webhook Error: ${err.message}`, err);
    return new Response(`Webhook error: ${err.message}`, {
      status: 500,
      headers: corsHeaders,
    });
  }
});

async function handleSuccessfulCharge(chargeData: any) {
  console.log(`Processing successful charge: ${chargeData.id}`);

  // 4. Double-check transaction with Flutterwave API as a security measure
  const isVerified = await verifyTransactionWithFlutterwave(chargeData.id);
  if (!isVerified) {
    console.warn(`Transaction verification with Flutterwave API failed for tx_ref: ${chargeData.tx_ref}. Aborting.`);
    return;
  }

  // 5. Check for idempotency: has this transaction already been processed?
  const { id: paymentId, tx_ref } = chargeData;
  const { data: existingTx, error: selectError } = await supabaseAdmin
    .from('payment_transactions')
    .select('id')
    .or(`payment_id.eq.${paymentId},tx_ref.eq.${tx_ref}`)
    .maybeSingle();

  if (selectError) {
      console.error('Database error while checking for existing transaction:', selectError);
      return; // Exit to prevent potential double processing on DB error
  }

  if (existingTx) {
    console.log(`Transaction ${paymentId} (${tx_ref}) has already been processed. Ignoring.`);
    return;
  }

  // 6. Log the verified transaction in the database
  const meta = chargeData.meta || chargeData.metadata || {};
  const { error: transactionError } = await logTransaction(chargeData, meta);
  if (transactionError) {
    console.error('Failed to log transaction, aborting fulfillment:', transactionError);
    return; // Do not proceed with fulfillment if logging fails
  }

  // 7. Fulfill the purchase (credits or subscription)
  const { type } = meta;
  if (type === 'credits') {
    await fulfillCreditPurchase(meta);
  } else if (type === 'subscription') {
    await fulfillSubscriptionPurchase(meta, chargeData);
  } else {
    console.warn(`Unknown purchase type '${type}' in metadata for tx_ref ${tx_ref}.`);
  }
}

async function verifyTransactionWithFlutterwave(transactionId: number): Promise<boolean> {
  try {
    const res = await fetch(`https://api.flutterwave.com/v3/transactions/${transactionId}/verify`, {
      headers: { Authorization: `Bearer ${FLW_SECRET_KEY}` },
    });
    if (!res.ok) {
      console.error(`Flutterwave API verification returned status: ${res.status}`);
      return false;
    }
    const verificationData = await res.json();
    return verificationData.status === 'success' && verificationData.data.status === 'successful';
  } catch (error) {
    console.error('Error during Flutterwave API verification call:', error);
    return false;
  }
}

async function logTransaction(chargeData: any, meta: any) {
  const { id, amount, currency, tx_ref } = chargeData;
  const { user_id, type, credits } = meta;

  console.log(`Logging transaction ${id} for user ${user_id}.`);
  return supabaseAdmin
    .from('payment_transactions')
    .insert({
      user_id: user_id,
      amount: amount,
      currency: currency?.toUpperCase() || 'USD',
      payment_method: 'flutterwave',
      status: 'completed',
      payment_id: id.toString(),
      tx_ref: tx_ref,
      credits_purchased: type === 'credits' ? parseInt(credits || '0', 10) : 0
    });
}

async function fulfillCreditPurchase(meta: any) {
  const { user_id, credits } = meta;
  if (!user_id || !credits) {
      console.error('Cannot fulfill credit purchase: missing user_id or credits in metadata.');
      return;
  }

  console.log(`Fulfilling ${credits} credits for user ${user_id}`);
  const { error } = await supabaseAdmin.rpc('update_user_credits', {
    p_user_id: user_id,
    p_amount: parseInt(credits, 10)
  });

  if (error) {
    console.error(`Error updating credits for user ${user_id}:`, error);
  } else {
    console.log(`Successfully updated credits for user ${user_id}.`);
  }
}

async function fulfillSubscriptionPurchase(meta: any, chargeData: any) {
  const { user_id, plan_id, plan_name, credits } = meta;
  if (!user_id || !plan_id) {
    console.error('Cannot fulfill subscription: missing user_id or plan_id in metadata.');
    return;
  }

  console.log(`Fulfilling subscription '${plan_name}' for user ${user_id}`);

  // Deactivate any existing active subscriptions for the user to prevent duplicates
  const { error: deactivateError } = await supabaseAdmin
    .from('user_subscriptions')
    .update({ subscription_status: 'inactive', updated_at: new Date().toISOString() })
    .eq('user_id', user_id)
    .eq('subscription_status', 'active');

  if (deactivateError) {
    console.error(`Failed to deactivate existing subscriptions for user ${user_id}:`, deactivateError);
  }

  // Create the new subscription record
  const subscriptionStartDate = new Date(chargeData.created_at);
  const expiresAt = new Date(subscriptionStartDate);
  expiresAt.setMonth(expiresAt.getMonth() + 1);

  const { error: subError } = await supabaseAdmin
    .from('user_subscriptions')
    .insert({
      user_id: user_id,
      subscription_type: plan_id,
      subscription_status: 'active',
      started_at: subscriptionStartDate.toISOString(),
      expires_at: expiresAt.toISOString(),
      payment_provider: 'flutterwave',
      payment_id: chargeData.id.toString(),
      tx_ref: chargeData.tx_ref
    });

  if (subError) {
    console.error(`Error creating new subscription for user ${user_id}:`, subError);
    return; // Stop if subscription creation fails
  } else {
     console.log(`Successfully created subscription for user ${user_id}.`);
  }

  // Grant any credits that come with the subscription plan
  if (credits && parseInt(credits, 10) > 0) {
    await fulfillCreditPurchase({ user_id, credits });
  }

  // Ensure the user has the 'subscriber' role
  const { error: roleError } = await supabaseAdmin
    .from('user_roles')
    .upsert({ user_id: user_id, role: 'subscriber' }, { onConflict: 'user_id,role' });

  if (roleError) {
    console.error(`Error upserting 'subscriber' role for user ${user_id}:`, roleError);
  } else {
    console.log(`Successfully ensured user ${user_id} has 'subscriber' role.`);
  }
}
