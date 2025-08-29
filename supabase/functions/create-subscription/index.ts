import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
    
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    if (!user?.email) throw new Error("User not authenticated");

    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: settingsData, error: settingsError } = await supabaseService
      .from("system_settings")
      .select("value")
      .eq("key", "payment_gateway_settings") // ✅ consistent key
      .single();

    if (settingsError) throw new Error("Could not load payment settings.");
    const settings = settingsData.value as PaymentGatewaySettings;

    const { priceId, planId, planName, amount, paystackPlanCode } =
      await req.json();

    if (!planId || !planName || !amount) {
      throw new Error("Missing required subscription fields.");
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
      if (!stripeKeys.secretKey) throw new Error(`Stripe ${settings.mode} secret key is not configured.`);

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
        success_url: `${req.headers.get(
          "origin"
        )}/subscriptions?status=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.get("origin")}/subscriptions?status=canceled`,
        metadata: { type: "subscription", user_id: user.id, plan_id: planId },
      });

      if (!session.url)
        throw new Error("Stripe session created but no URL returned.");
      return new Response(JSON.stringify({ url: session.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Paystack flow
    if (settings.activeGateway === "paystack") {
      if (!paystackPlanCode)
        throw new Error("Paystack plan code is required for subscription.");

      const paystackKeys =
        settings.mode === "live"
          ? settings.paystack.live
          : settings.paystack.test;
      if (!paystackKeys.secretKey)
        throw new Error(
          `Paystack ${settings.mode} secret key is not configured.`
        );

      const paystack = new PaystackClient(paystackKeys.secretKey);
      const tx = await paystack.initTransaction({
        email: user.email,
        amount: amount * 100, // ✅ convert to kobo
        plan: paystackPlanCode,
        currency: "NGN",
        callback_url: `${req.headers.get(
          "origin"
        )}/subscriptions?status=success`,
        metadata: {
          type: "subscription",
          user_id: user.id,
          plan_id: planId,
        },
      });

      if (!tx.authorization_url)
        throw new Error(
          "Paystack transaction created but no authorization URL returned."
        );
      return new Response(JSON.stringify({ url: tx.authorization_url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unsupported payment gateway: ${settings.activeGateway}.`);
  } catch (error) {
    console.error("Subscription creation error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to create subscription session",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});