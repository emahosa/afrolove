import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  console.log("🔎 Paystack verification request:", {
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
    
    console.log("📋 Verification request data:", { reference, type, credits, planId });
    
    if (!reference || !type) {
      throw new Error('Missing required fields: reference and type are required.');
    }

    // Get Paystack secret key from payment gateway settings
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: settingsData, error: settingsError } = await supabaseAdmin
      .from('system_settings')
      .select('value')
      .eq('key', 'payment_gateway_settings')
      .single();

    if (settingsError || !settingsData?.value) {
      console.error("❌ Payment settings not found:", settingsError);
      throw new Error('Payment gateway settings not configured.');
    }

    let settings;
    if (typeof settingsData.value === 'string') {
      settings = JSON.parse(settingsData.value);
    } else {
      settings = settingsData.value;
    }

    const paystackKeys = settings.mode === 'live' ? settings.paystack?.live : settings.paystack?.test;
    const secretKey = paystackKeys?.secretKey;

    if (!secretKey) {
      throw new Error(`Paystack secret key for ${settings.mode} mode is not configured.`);
    }

    console.log("🔑 Using Paystack secret key for verification");

    // Verify transaction with Paystack
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error("❌ Paystack verification failed:", response.status, response.statusText);
      throw new Error(`Failed to verify transaction with Paystack: ${response.status} ${response.statusText}`);
    }

    const verificationData = await response.json();
    console.log("📊 Paystack verification response:", verificationData);

    if (!verificationData.status || verificationData.data.status !== 'success') {
      console.error("❌ Transaction not successful:", verificationData);
      throw new Error('Transaction was not successful according to Paystack.');
    }

    // Check if transaction already processed
    const { data: existingTx, error: txCheckError } = await supabaseAdmin
      .from('payment_transactions')
      .select('id')
      .eq('payment_id', reference)
      .single();

    if (txCheckError && txCheckError.code !== 'PGRST116') {
      console.error("❌ Error checking existing transaction:", txCheckError);
      throw txCheckError;
    }

    if (existingTx) {
      console.log("✅ Transaction already processed:", reference);
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Transaction already processed.',
        alreadyProcessed: true 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const userId = verificationData.data.metadata?.user_id;
    if (!userId) {
      console.error("❌ User ID not found in metadata:", verificationData.data.metadata);
      throw new Error('User ID not found in transaction metadata.');
    }

    console.log("👤 Processing for user:", userId);

    // Log the payment transaction
    const transactionData = {
      user_id: userId,
      amount: verificationData.data.amount / 100, // Convert from kobo to naira
      currency: verificationData.data.currency?.toUpperCase() || 'NGN',
      payment_method: 'paystack',
      status: 'completed',
      payment_id: reference,
      credits_purchased: type === 'credits' ? (credits || 0) : 0
    };

    console.log("💾 Logging transaction:", transactionData);

    const { error: transactionError } = await supabaseAdmin
      .from('payment_transactions')
      .insert(transactionData);

    if (transactionError) {
      console.error("❌ Error logging transaction:", transactionError);
      // Continue processing even if transaction logging fails
    }

    if (type === 'credits') {
      if (!credits || credits <= 0) {
        throw new Error('Credits amount is required and must be positive for credit purchases.');
      }

      console.log(`💳 Adding ${credits} credits to user ${userId}`);

      // Update user credits using RPC function
      const { data: newBalance, error: creditError } = await supabaseAdmin.rpc('update_user_credits', {
        p_user_id: userId,
        p_amount: credits
      });

      if (creditError) {
        console.error("❌ Error updating credits:", creditError);
        throw new Error(`Failed to update user credits: ${creditError.message}`);
      }

      console.log(`✅ Credits updated successfully. New balance: ${newBalance}`);

    } else if (type === 'subscription') {
      if (!planId) {
        throw new Error('Plan ID is required for subscriptions.');
      }

      console.log(`📋 Activating subscription for user ${userId} with plan ${planId}`);

      const subscriptionStartDate = new Date();
      const expiresAt = new Date(subscriptionStartDate);
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      // Deactivate existing subscriptions
      const { error: deactivateError } = await supabaseAdmin
        .from('user_subscriptions')
        .update({ 
          subscription_status: 'inactive',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('subscription_status', 'active');

      if (deactivateError) {
        console.error("⚠️ Error deactivating existing subscriptions:", deactivateError);
      }

      // Create new subscription
      const subscriptionData = {
        user_id: userId,
        subscription_type: planId,
        subscription_status: 'active',
        started_at: subscriptionStartDate.toISOString(),
        expires_at: expiresAt.toISOString(),
        paystack_subscription_code: verificationData.data.subscription_code,
        paystack_customer_code: verificationData.data.customer?.customer_code,
        updated_at: new Date().toISOString()
      };

      const { error: subError } = await supabaseAdmin
        .from('user_subscriptions')
        .upsert(subscriptionData, { onConflict: 'user_id' });

      if (subError) {
        console.error("❌ Error creating subscription:", subError);
        throw new Error(`Failed to create subscription: ${subError.message}`);
      }

      // Update user roles
      await supabaseAdmin
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'voter');

      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .upsert({ 
          user_id: userId, 
          role: 'subscriber' 
        }, { 
          onConflict: 'user_id,role' 
        });

      if (roleError) {
        console.error("⚠️ Error updating user role:", roleError);
      }

      console.log(`✅ Subscription activated successfully for user ${userId}`);
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: `${type === 'credits' ? 'Credits' : 'Subscription'} processed successfully`,
      type,
      reference
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('❌ Paystack verification error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to verify Paystack transaction',
      success: false 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});