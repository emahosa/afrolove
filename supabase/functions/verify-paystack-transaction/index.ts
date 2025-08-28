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
    const { reference } = await req.json();
    if (!reference) {
      throw new Error("Transaction reference is required");
    }

    const paystack = new Paystack(Deno.env.get("PAYSTACK_SECRET_KEY") || "");
    const transaction = await paystack.transaction.verify(reference);

    if (!transaction.status || transaction.data.status !== 'success') {
      throw new Error(transaction.message || 'Transaction not successful');
    }

    // Transaction is successful, you can now provision value to the user.
    // The webhook will also handle this, but this provides a faster response to the user.

    // You can add logic here to check if the transaction has already been processed
    // by checking your database for the transaction reference.

    return new Response(JSON.stringify({ verified: true, ...transaction.data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Paystack transaction verification error:", error);
    return new Response(JSON.stringify({ error: error.message, verified: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
