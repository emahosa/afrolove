import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Paystack } from "https://jsr.io/@irabeny/paystack-sdk/mod.ts";
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

    const { planId, planName, amount } = await req.json();

    const paystack = new Paystack(Deno.env.get("PAYSTACK_SECRET_KEY") || "");

    // First, check if a plan with this ID already exists on Paystack
    // This is a simplified approach. A more robust solution would be to store the paystack plan code in your database.
    const plans = await paystack.plan.list();
    let paystackPlan = plans.data.find(p => p.name === planName);

    if (!paystackPlan) {
        // Create a new plan on Paystack
        const newPlan = await paystack.plan.create({
            name: planName,
            amount: (amount * 100).toString(), // in kobo
            interval: "monthly", // or other intervals as needed
            description: `Subscription to ${planName}`,
        });

        if (!newPlan.status) {
            throw new Error(`Failed to create Paystack plan: ${newPlan.message}`);
        }
        paystackPlan = newPlan.data;
    }

    if (!paystackPlan?.plan_code) {
        throw new Error("Could not create or find Paystack plan.");
    }

    // Now, initialize a transaction to subscribe the user to the plan
    const transaction = await paystack.transaction.initialize({
      email: user.email,
      amount: (amount * 100).toString(),
      plan: paystackPlan.plan_code,
      metadata: {
        user_id: user.id,
        plan_id: planId,
        plan_name: planName,
      },
      callback_url: `${req.headers.get("origin")}/subscribe?subscription=success&provider=paystack`,
    });

    if (!transaction.status) {
      throw new Error(transaction.message);
    }

    return new Response(JSON.stringify({ url: transaction.data.authorization_url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Paystack subscription creation error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
