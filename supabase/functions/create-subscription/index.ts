import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { PaystackClient } from "../_shared/paystack.ts";

// Define new interfaces for settings
interface ApiKeys {
  publicKey: string;
  secretKey: string;
}
interface GatewayConfig {
  test: ApiKeys;
  live: ApiKeys;
}
interface PaymentGatewaySettings {
  enabled: boolean;
  mode: 'test' | 'live';
  activeGateway: 'stripe' | 'paystack';
  stripe: GatewayConfig;
  paystack: GatewayConfig;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization header required");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );
    
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user?.email) throw new Error("User not authenticated");

    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: settingsData, error: settingsError } = await supabaseService
      .from('system_settings')
      .select('value')
      .eq('key', 'payment_gateway_settings')
      .single();

    if (settingsError) {
      console.error("Error loading payment settings:", settingsError);
      throw new Error('Could not load system payment settings.');
    }
    if (!settingsData?.value) {
      throw new Error('Payment settings are not configured in the system.');
    }

    let settings: PaymentGatewaySettings;
    if (typeof settingsData.value === 'string') {
      console.warn('settingsData.value was stringified JSON, parsing now.');
      settings = JSON.parse(settingsData.value);
    } else {
      settings = settingsData.value as PaymentGatewaySettings;
    }

    const { priceId, planId, planName, paystackPlanCode, credits } = await req.json();

    if (!planId || !planName) {
      throw new Error("Missing required subscription fields: planId and planName are required.");
    }

    if (!settings?.enabled) {
      throw new Error("Payment processing is currently disabled.");
    }

    if (!settings.activeGateway) {
      throw new Error("No payment gateway is currently configured.");
    }

    // --- Stripe Subscription Flow ---
    if (settings.activeGateway === 'stripe') {
      if (!priceId) throw new Error("Stripe price ID is required for subscription.");

      const stripeKeys = settings.mode === 'live' ? settings.stripe.live : settings.stripe.test;
      if (!stripeKeys?.secretKey) {
        throw new Error(`Stripe secret key for ${settings.mode} mode is not configured.`);
      }

      const stripe = new Stripe(stripeKeys.secretKey, { apiVersion: "2023-10-16" });

      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      let customerId = customers.data.length > 0 ? customers.data[0].id : undefined;
      if (!customerId) {
        const newCustomer = await stripe.customers.create({ email: user.email });
        customerId = newCustomer.id;
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        success_url: `${req.headers.get("origin")}/billing?subscription=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.get("origin")}/billing?subscription=canceled`,
        metadata: {
          type: 'subscription',
          user_id: user.id,
          plan_id: planId,
          credits: credits ? credits.toString() : '0',
        }
      });

      if (!session.url) throw new Error("Stripe session created but no URL returned.");
      return new Response(JSON.stringify({ url: session.url }), { headers: { ...corsHeaders, "Content-Type": "application/json" }});
    }

    // --- Paystack Subscription Flow ---
    if (settings.activeGateway === 'paystack') {
      if (!paystackPlanCode) throw new Error("Paystack plan code is required for subscription.");

      const paystackKeys = settings.mode === 'live' ? settings.paystack.live : settings.paystack.test;
      if (!paystackKeys?.secretKey) {
        throw new Error(`Paystack secret key for ${settings.mode} mode is not configured.`);
      }

      const paystack = new PaystackClient(paystackKeys.secretKey);

      // We should not be sending both amount and plan to Paystack.
      // The `initTransaction` function in `paystack.ts` handles this, but it's better to be explicit.
      const tx = await paystack.initTransaction({
        email: user.email,
        plan: paystackPlanCode,
        callback_url: `${req.headers.get("origin")}/billing?subscription=success`,
        metadata: {
          type: 'subscription',
          user_id: user.id,
          plan_id: planId,
          credits: credits || 0,
        }
      });

      if (!tx.authorization_url) throw new Error("Paystack transaction created but no authorization URL returned.");
      return new Response(JSON.stringify({ url: tx.authorization_url }), { headers: { ...corsHeaders, "Content-Type": "application/json" }});
    }

    throw new Error(`Unsupported payment gateway: ${settings.activeGateway}.`);
  } catch (error) {
    console.error("Subscription creation error:", error);
    return new Response(JSON.stringify({ error: error.message || "Failed to create subscription session" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});