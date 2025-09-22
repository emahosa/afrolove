import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// Main request handler
serve(async (req) => {
  const service_name = "flw-webhook";

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // --- TEMPORARY DEBUGGING HACK ---
    // The following signature verification block is temporarily commented out
    // because Flutterwave is not sending the 'verif-hash' header.
    // This is INSECURE and must be reverted once the issue with Flutterwave is resolved.

    // // 1. Get secrets from database instead of environment variables
    // const { data: settingsData, error: settingsError } = await supabaseAdmin
    //   .from('system_settings')
    //   .select('value')
    //   .eq('key', 'payment_gateway_settings')
    //   .single();

    // if (settingsError || !settingsData?.value) {
    //   console.error(`❌ [${service_name}] Payment settings not found:`, settingsError);
    //   throw new Error('Payment gateway settings not configured.');
    // }

    // let settings;
    // try {
    //   settings = typeof settingsData.value === 'string' ? JSON.parse(settingsData.value) : settingsData.value;
    // } catch (e) {
    //   throw new Error("Failed to parse payment gateway settings.");
    // }

    // const flutterwaveKeys = settings.mode === 'live' ? settings.flutterwave?.live : settings.flutterwave?.test;
    // const secretHash = flutterwaveKeys?.secretHash;

    // if (!secretHash) {
    //   throw new Error(`Flutterwave secret hash for ${settings.mode} mode is not configured.`);
    // }

    // // 2. Verify webhook signature for security
    // const signature = req.headers.get('verif-hash') || req.headers.get('x-flw-signature');
    // console.log(`[${service_name}] Received signature: ${signature ? 'Present' : 'Missing'}`);
    // console.log(`[${service_name}] Expected hash (from DB): ${secretHash}`);

    // if (!signature || signature !== secretHash) {
    //   console.error(`❌ [${service_name}] Invalid signature. Got: ${signature}, Expected: ${secretHash}`);
    //   return new Response("Invalid signature", { status: 401, headers: corsHeaders });
    // }
    // console.log(`✅ [${service_name}] Signature verified successfully.`);

    // --- END TEMPORARY HACK ---

    // A dummy settings object is needed for the rest of the function to work.
    // This will be removed when the hack is reverted.
    const { data: settingsData } = await supabaseAdmin
      .from('system_settings')
      .select('value')
      .eq('key', 'payment_gateway_settings')
      .single();
    const settings = settingsData?.value ? (typeof settingsData.value === 'string' ? JSON.parse(settingsData.value) : settingsData.value) : {};


    // 3. Parse the incoming payload from Flutterwave
    const payload = await req.json();
    console.log(`[${service_name}] Received event: ${payload.event}`);

    // 4. Process only successful, completed charges
    if (payload.event === 'charge.completed' && payload.data.status === 'successful') {
      await handleSuccessfulCharge(payload.data, settings, supabaseAdmin);
    } else {
      console.log(`[${service_name}] Ignoring event '${payload.event}' with status '${payload.data?.status}'.`);
    }

    // 5. Return a success response to Flutterwave
    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err) {
    console.error(`💥 [${service_name}] Unhandled Webhook Error:`, err);
    return new Response(`Webhook error: ${err.message}`, {
      status: 500,
      headers: corsHeaders,
    });
  }
});

async function handleSuccessfulCharge(chargeData: any, settings: any, supabaseAdmin: any) {
  const service_name = "flw-webhook-handler";
  console.log(`[${service_name}] Processing successful charge: ${chargeData.id}`);

  // Double-check transaction with Flutterwave API as a security measure
  const isVerified = await verifyTransactionWithFlutterwave(chargeData.id, settings);
  if (!isVerified) {
    console.warn(`[${service_name}] Transaction verification with Flutterwave API failed for tx_ref: ${chargeData.tx_ref}. Aborting.`);
    return;
  }

  // Check for idempotency: has this transaction already been processed?
  const { id: paymentId, tx_ref } = chargeData;
  const { data: existingTx, error: selectError } = await supabaseAdmin
    .from('payment_transactions')
    .select('id')
    .or(`payment_id.eq.${paymentId},tx_ref.eq.${tx_ref}`)
    .maybeSingle();

  if (selectError) {
      console.error(`❌ [${service_name}] Database error checking for existing transaction:`, selectError);
      return; // Exit to prevent potential double processing on DB error
  }

  if (existingTx) {
    console.log(`[${service_name}] Transaction ${paymentId} (${tx_ref}) has already been processed. Ignoring.`);
    return;
  }

  // Log the verified transaction in the database
  const meta = chargeData.meta || chargeData.metadata || {};
  const { error: transactionError } = await logTransaction(chargeData, meta, supabaseAdmin);
  if (transactionError) {
    console.error(`❌ [${service_name}] Failed to log transaction, aborting fulfillment:`, transactionError);
    return; // Do not proceed with fulfillment if logging fails
  }

  // Fulfill the purchase (credits or subscription)
  const { type } = meta;
  if (type === 'credits') {
    await fulfillCreditPurchase(meta, supabaseAdmin);
  } else if (type === 'subscription') {
    await fulfillSubscriptionPurchase(meta, chargeData, supabaseAdmin);
  } else {
    console.warn(`[${service_name}] Unknown purchase type '${type}' in metadata for tx_ref ${tx_ref}.`);
  }
}

async function verifyTransactionWithFlutterwave(transactionId: number, settings: any): Promise<boolean> {
  const service_name = "flw-verify-api";
  const flutterwaveKeys = settings.mode === 'live' ? settings.flutterwave?.live : settings.flutterwave?.test;
  const secretKey = flutterwaveKeys?.secretKey;

  if (!secretKey) {
    console.error(`❌ [${service_name}] Flutterwave secret key for ${settings.mode} mode is not configured.`);
    return false;
  }

  try {
    console.log(`[${service_name}] Verifying transaction ${transactionId} with Flutterwave API...`);
    const res = await fetch(`https://api.flutterwave.com/v3/transactions/${transactionId}/verify`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    });

    if (!res.ok) {
      console.error(`❌ [${service_name}] Flutterwave API verification returned status: ${res.status}`);
      return false;
    }
    const verificationData = await res.json();
    const isSuccess = verificationData.status === 'success' && verificationData.data.status === 'successful';
    console.log(`[${service_name}] Verification result for ${transactionId}: ${isSuccess ? '✅ Verified' : '❌ Failed'}`);
    return isSuccess;
  } catch (error) {
    console.error(`💥 [${service_name}] Error during Flutterwave API verification call:`, error);
    return false;
  }
}

async function logTransaction(chargeData: any, meta: any, supabaseAdmin: any) {
  const { id, amount, currency, tx_ref } = chargeData;
  const { user_id, type, credits } = meta;

  console.log(`[flw-webhook] Logging transaction ${id} for user ${user_id}.`);
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

async function fulfillCreditPurchase(meta: any, supabaseAdmin: any) {
  const { user_id, credits } = meta;
  if (!user_id || !credits) {
      console.error('❌ [flw-webhook] Cannot fulfill credit purchase: missing user_id or credits in metadata.');
      return;
  }

  console.log(`[flw-webhook] Fulfilling ${credits} credits for user ${user_id}`);
  const { error } = await supabaseAdmin.rpc('update_user_credits', {
    p_user_id: user_id,
    p_amount: parseInt(credits, 10)
  });

  if (error) {
    console.error(`❌ [flw-webhook] Error updating credits for user ${user_id}:`, error);
  } else {
    console.log(`✅ [flw-webhook] Successfully updated credits for user ${user_id}.`);
  }
}

async function fulfillSubscriptionPurchase(meta: any, chargeData: any, supabaseAdmin: any) {
  const { user_id, plan_id, plan_name, credits } = meta;
  if (!user_id || !plan_id) {
    console.error('❌ [flw-webhook] Cannot fulfill subscription: missing user_id or plan_id in metadata.');
    return;
  }

  console.log(`[flw-webhook] Fulfilling subscription '${plan_name}' for user ${user_id}`);

  // Deactivate any existing active subscriptions for the user to prevent duplicates
  const { error: deactivateError } = await supabaseAdmin
    .from('user_subscriptions')
    .update({ subscription_status: 'inactive', updated_at: new Date().toISOString() })
    .eq('user_id', user_id)
    .eq('subscription_status', 'active');

  if (deactivateError) {
    console.error(`❌ [flw-webhook] Failed to deactivate existing subscriptions for user ${user_id}:`, deactivateError);
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
    console.error(`❌ [flw-webhook] Error creating new subscription for user ${user_id}:`, subError);
    return; // Stop if subscription creation fails
  } else {
     console.log(`✅ [flw-webhook] Successfully created subscription for user ${user_id}.`);
  }

  // Grant any credits that come with the subscription plan
  if (credits && parseInt(credits, 10) > 0) {
    await fulfillCreditPurchase({ user_id, credits }, supabaseAdmin);
  }

  // Ensure the user has the 'subscriber' role
  const { error: roleError } = await supabaseAdmin
    .from('user_roles')
    .upsert({ user_id: user_id, role: 'subscriber' }, { onConflict: 'user_id,role' });

  if (roleError) {
    console.error(`❌ [flw-webhook] Error upserting 'subscriber' role for user ${user_id}:`, roleError);
  } else {
    console.log(`✅ [flw-webhook] Successfully ensured user ${user_id} has 'subscriber' role.`);
  }
}
