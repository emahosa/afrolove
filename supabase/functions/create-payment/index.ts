
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { PaystackClient } from "../_shared/paystack.ts";

// Define interfaces for settings
interface PaymentGatewaySettings {
  enabled: boolean;
  activeGateway: 'stripe' | 'paystack';
  stripe: {
    publicKey: string;
    secretKey: string;
  };
  paystack: {
    publicKey: string;
    secretKey: string;
  };
}

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

    console.log('🔍 Checking payment gateway settings...');

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

    if (settingsError && settingsError.code !== 'PGRST116') {
      console.error('❌ Error loading payment gateway settings:', settingsError);
      throw new Error('Could not load payment settings.');
    }

    const settings = settingsData?.value as PaymentGatewaySettings | undefined;

    const { amount, credits, description, packId } = await req.json();

    // If payment gateways are disabled, throw an error
    if (!settings?.enabled) {
      console.error('❌ Payment gateways are disabled. Cannot process payment.');
      throw new Error("The payment system is currently disabled. Please contact support.");
    }

    // --- Stripe Payment Flow ---
    if (settings.activeGateway === 'stripe') {
      console.log('💳 Stripe enabled - creating checkout session');

      if (!settings.stripe?.secretKey && !Deno.env.get("STRIPE_SECRET_KEY")) {
        throw new Error("Stripe secret key is not configured.");
      }

      const stripe = new Stripe(settings.stripe.secretKey || Deno.env.get("STRIPE_SECRET_KEY")!, {
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
                name: description || `Credit Pack - ${credits} credits`,
                description: `${credits} credits for MelodyVerse`,
                metadata: { type: 'credits', amount: credits.toString() }
              },
              unit_amount: amount,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${req.headers.get("origin")}/credits?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.get("origin")}/credits?payment=canceled`,
        metadata: {
          type: 'credits',
          user_id: user.id,
          credits: credits.toString(),
          pack_id: packId,
          user_email: user.email
        }
      });

      console.log("Stripe session created successfully:", session.id);

      return new Response(JSON.stringify({ url: session.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // --- Paystack Payment Flow ---
    if (settings.activeGateway === 'paystack') {
      console.log('💳 Paystack enabled - creating transaction');

      if (!settings.paystack?.secretKey) {
        throw new Error("Paystack secret key is not configured.");
      }

      const paystack = new PaystackClient(settings.paystack.secretKey);

      const tx = await paystack.initTransaction({
        email: user.email,
        amount: amount, // Amount is already in cents/kobo
        currency: 'NGN', // Or get from request if supporting multiple currencies
        callback_url: `${req.headers.get("origin")}/credits?payment=success`,
        metadata: {
          type: 'credits',
          user_id: user.id,
          credits: credits,
          pack_id: packId,
          user_email: user.email
        }
      });

      console.log("Paystack transaction initialized successfully:", tx.reference);

      return new Response(JSON.stringify({ url: tx.authorization_url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // If no gateway is active or configured
    throw new Error("No active payment gateway configured.");
  } catch (error) {
    console.error("Payment creation error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
