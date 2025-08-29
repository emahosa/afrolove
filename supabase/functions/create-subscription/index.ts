import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { PaystackClient } from "../_shared/paystack.ts";

interface PaymentGatewaySettings {
  enabled: boolean;
  activeGateway: 'stripe' | 'paystack';
  paystack: {
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

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    
    if (!user) {
      throw new Error("User not authenticated");
    }

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
      throw new Error('Could not load payment settings.');
    }

    const settings = settingsData?.value as PaymentGatewaySettings | undefined;
    const { planId, planName, credits, paystackPlanCode, email } = await req.json();

    if (!settings?.enabled || settings?.activeGateway !== 'paystack') {
      throw new Error("The payment system is not configured for Paystack subscriptions.");
    }

    if (!settings.paystack?.secretKey) {
      throw new Error("Paystack secret key is not configured.");
    }
    if (!paystackPlanCode) {
      throw new Error("Paystack plan code is required for subscription.");
    }

    const paystack = new PaystackClient(settings.paystack.secretKey);

    const tx = await paystack.initTransaction({
      email: email,
      plan: paystackPlanCode,
      callback_url: `${req.headers.get("origin")}/subscribe?subscription=success`,
      metadata: {
        type: 'subscription',
        user_id: user.id,
        plan_id: planId,
        plan_name: planName,
        user_email: email,
        credits: credits || 0
      }
    });

    return new Response(JSON.stringify({ url: tx.authorization_url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Subscription creation error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
