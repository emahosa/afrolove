
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization header required");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    
    if (!user?.email) {
      throw new Error("User not authenticated");
    }

    console.log('🔍 Checking Stripe settings...');

    // Check if Stripe is enabled - using service role key for reliable access
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: stripeSettings, error: settingsError } = await supabaseService
      .from('system_settings')
      .select('value')
      .eq('key', 'stripe_enabled')
      .maybeSingle();

    let isStripeEnabled = true; // Default to enabled for safety
    
    if (!settingsError && stripeSettings?.value && typeof stripeSettings.value === 'object' && stripeSettings.value !== null) {
      const settingValue = stripeSettings.value as { enabled?: boolean };
      isStripeEnabled = settingValue.enabled === true;
      console.log('🔍 Stripe setting found:', settingValue);
    } else {
      console.log('🔍 No Stripe setting found or error:', settingsError);
    }

    console.log('🔍 Stripe enabled status:', isStripeEnabled);

    const { priceId, planId, planName, amount } = await req.json();

    // If Stripe is disabled, process subscription automatically
    if (!isStripeEnabled) {
      console.log('🔄 Stripe disabled - processing automatic subscription');
      
      const subscriptionStartDate = new Date();
      const expiresAt = new Date(subscriptionStartDate);
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      // First, deactivate existing subscriptions
      const { error: deactivateError } = await supabaseService
        .from('user_subscriptions')
        .update({ 
          subscription_status: 'inactive',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('subscription_status', 'active');

      if (deactivateError) {
        console.error('❌ Error deactivating existing subscriptions:', deactivateError);
      }

      // Create new subscription record
      const { error: subError } = await supabaseService
        .from('user_subscriptions')
        .insert({
          user_id: user.id,
          subscription_type: planId,
          subscription_status: 'active',
          started_at: subscriptionStartDate.toISOString(),
          expires_at: expiresAt.toISOString(),
          stripe_subscription_id: `auto-${Date.now()}`,
          stripe_customer_id: `auto-customer-${user.id}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (subError) {
        console.error('❌ Error creating subscription:', subError);
        throw new Error('Failed to create subscription');
      }

      // Update user roles - remove voter, add subscriber
      const { error: deleteRoleError } = await supabaseService
        .from('user_roles')
        .delete()
        .eq('user_id', user.id)
        .eq('role', 'voter');

      if (deleteRoleError) {
        console.error('❌ Error removing voter role:', deleteRoleError);
      }

      const { error: addRoleError } = await supabaseService
        .from('user_roles')
        .upsert({ 
          user_id: user.id, 
          role: 'subscriber' 
        }, { 
          onConflict: 'user_id,role' 
        });

      if (addRoleError) {
        console.error('❌ Error adding subscriber role:', addRoleError);
      }

      // Log the transaction
      const { error: transactionError } = await supabaseService
        .from('payment_transactions')
        .insert({
          user_id: user.id,
          amount: amount / 100, // Convert from cents
          currency: 'USD',
          payment_method: 'automatic',
          status: 'completed',
          payment_id: `auto-${Date.now()}`,
          credits_purchased: 0
        });

      if (transactionError) {
        console.error('❌ Error logging transaction:', transactionError);
      }

      console.log('✅ Subscription activated automatically');
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Subscription activated successfully' 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Stripe is enabled - proceed with normal Stripe checkout
    console.log('🔄 Stripe enabled - creating subscription session');

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Create subscription checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { 
              name: `${planName} Subscription`,
              description: `Monthly subscription to ${planName} plan`,
              metadata: {
                type: 'subscription',
                plan: planId
              }
            },
            unit_amount: amount,
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${req.headers.get("origin")}/subscribe?subscription=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/subscribe?subscription=canceled`,
      metadata: {
        type: 'subscription',
        user_id: user.id,
        plan_id: planId,
        plan_name: planName,
        user_email: user.email
      }
    });

    console.log("Subscription session created successfully:", session.id);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Subscription creation error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
