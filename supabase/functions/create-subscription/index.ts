
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log('--- [DEBUG] create-subscription function invoked ---');
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

    console.log('🔍 Checking payment gateway settings...');

    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // 1. Check the new payment_gateways table first
    const { data: gateways, error: gatewayError } = await supabaseService
      .from('payment_gateways')
      .select('*')
      .eq('enabled', true);

    if (gatewayError) {
      console.error('Could not fetch payment gateway settings. Falling back.', gatewayError);
    }

    let activeGateway = gateways?.[0]; // Use the first enabled gateway

    // 2. If no active gateway in the new table, check the old system_settings
    if (!activeGateway) {
      console.log('🤔 No active gateway in new table, checking legacy settings...');
      const { data: stripeSettings, error: settingsError } = await supabaseService
        .from('system_settings')
        .select('value')
        .eq('key', 'stripe_enabled')
        .maybeSingle();

      if (!settingsError && stripeSettings?.value && (stripeSettings.value as any).enabled === true) {
        console.log('✅ Legacy Stripe setting is enabled.');
        activeGateway = {
          name: 'stripe',
          secret_key: Deno.env.get("STRIPE_SECRET_KEY") || "",
        };
      }
    }

    const { priceId, planId, planName, amount, credits } = await req.json();

    // If no active gateway is found in either new or old system, process automatically
    if (!activeGateway) {
      console.log('🔄 No active payment gateway found - processing automatic subscription');
      
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

      // Upsert subscription record
      const { error: subError } = await supabaseService
        .from('user_subscriptions')
        .upsert({
          user_id: user.id,
          subscription_type: planId,
          subscription_status: 'active',
          started_at: subscriptionStartDate.toISOString(),
          expires_at: expiresAt.toISOString(),
          stripe_subscription_id: `auto-${Date.now()}`,
          stripe_customer_id: `auto-customer-${user.id}`,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (subError) {
        console.error('❌ Error upserting subscription:', subError);
        throw new Error('Failed to upsert subscription');
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
          credits_purchased: credits || 0
        });

      if (transactionError) {
        console.error('❌ Error logging transaction:', transactionError);
      }

      // Add credits to user's profile
      if (credits && credits > 0) {
        console.log(`💰 Awarding ${credits} credits to user ${user.id}`);
        const { error: creditError } = await supabaseService.rpc('update_user_credits', {
          p_user_id: user.id,
          p_amount: credits
        });

        if (creditError) {
          console.error('❌ Error adding credits to user profile:', creditError);
        } else {
          console.log('✅ Credits awarded successfully');
        }
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

    // A gateway is active, process payment
    switch (activeGateway.name) {
      case 'stripe': {
        console.log('🔄 Stripe enabled - creating subscription session');

        const stripe = new Stripe(activeGateway.secret_key || "", {
          apiVersion: "2023-10-16",
        });

        const customers = await stripe.customers.list({ email: user.email, limit: 1 });
        let customerId;
        if (customers.data.length > 0) {
          customerId = customers.data[0].id;
        }

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
                  metadata: { type: 'subscription', plan: planId }
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
            user_email: user.email,
            credits: credits || 0
          }
        });

        console.log("Stripe session created successfully:", session.id);
        return new Response(JSON.stringify({ url: session.url }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      case 'paystack': {
        console.log('🔄 Paystack enabled - creating transaction');

        if (!activeGateway.secret_key) {
          throw new Error("Paystack secret key is not configured.");
        }

        const paystackResponse = await fetch("https://api.paystack.co/transaction/initialize", {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${activeGateway.secret_key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: user.email,
            amount: amount, // Amount is already in cents/kobo
            callback_url: `${req.headers.get("origin")}/subscribe?subscription=success`,
            metadata: {
              user_id: user.id,
              plan_id: planId,
              plan_name: planName,
              credits: credits || 0,
              cancel_action: `${req.headers.get("origin")}/subscribe?subscription=canceled`,
            }
          }),
        });

        const paystackData = await paystackResponse.json();

        if (!paystackResponse.ok) {
          throw new Error(paystackData.message || 'Paystack API error');
        }

        console.log("Paystack transaction initialized successfully");
        return new Response(JSON.stringify({ url: paystackData.data.authorization_url }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      default: {
        throw new Error(`Unsupported payment gateway: ${activeGateway.name}`);
      }
    }
  } catch (error) {
    console.error("Subscription creation error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
