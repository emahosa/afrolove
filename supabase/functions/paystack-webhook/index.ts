import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createHmac } from "https://deno.land/std@0.190.0/node/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-paystack-signature",
};

function verifyWebhookSignature(body: string, signature: string, secret: string): boolean {
  const hash = createHmac("sha512", secret).update(body).digest("hex");
  return hash === signature;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseService = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const signature = req.headers.get("x-paystack-signature");
    if (!signature) {
      throw new Error("Missing Paystack signature");
    }

    const body = await req.text();

    const { data: settingsData, error: settingsError } = await supabaseService
      .from('system_settings')
      .select('value')
      .eq('key', 'payment_gateway_settings')
      .single();

    if (settingsError) {
      throw new Error("Could not load payment settings to verify webhook.");
    }

    const secret = settingsData?.value?.paystack?.secretKey;
    if (!secret) {
      throw new Error("Paystack secret key not found in settings.");
    }

    if (!verifyWebhookSignature(body, signature, secret)) {
      return new Response("Invalid signature", { status: 401, headers: corsHeaders });
    }

    const event = JSON.parse(body);

    if (event.event === "charge.success") {
      const { data } = event;
      const metadata = data.metadata;
      const userId = metadata?.user_id;
      const credits = metadata?.credits;

      if (!userId || !credits) {
        throw new Error("Missing user_id or credits in webhook metadata");
      }

      console.log(`✅ Processing successful charge for user ${userId}, credits: ${credits}`);

      const { error: creditError } = await supabaseService.rpc('update_user_credits', {
        p_user_id: userId,
        p_amount: credits
      });

      if (creditError) {
        console.error('❌ Error updating credits:', creditError);
        throw new Error('Failed to add credits');
      }

      const { error: transactionError } = await supabaseService
        .from('payment_transactions')
        .insert({
          user_id: userId,
          amount: data.amount / 100,
          currency: data.currency,
          payment_method: 'paystack',
          status: 'completed',
          payment_id: data.reference,
          credits_purchased: credits,
        });

      if (transactionError) {
        console.error('❌ Error logging transaction:', transactionError);
      }

      console.log(`✅ Credits added successfully for user ${userId}.`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Paystack webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
