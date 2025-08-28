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

    const { amount, credits, description } = await req.json();

    const paystack = new Paystack(Deno.env.get("PAYSTACK_SECRET_KEY") || "");

    const transaction = await paystack.transaction.initialize({
      email: user.email,
      amount: (amount * 100).toString(), // Paystack expects amount in kobo
      metadata: {
        user_id: user.id,
        credits: credits.toString(),
        description: description || `Credit Pack - ${credits} credits`,
      },
      callback_url: `${req.headers.get("origin")}/credits?payment=success&provider=paystack`,
    });

    if (!transaction.status) {
      throw new Error(transaction.message);
    }

    return new Response(JSON.stringify({ url: transaction.data.authorization_url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Paystack payment creation error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
