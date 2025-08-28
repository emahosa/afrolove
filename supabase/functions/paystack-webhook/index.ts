import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-paystack-signature",
};

// Helper to convert ArrayBuffer to hex string
function bufferToHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Clone the request so we can read the body text for signature verification
    const reqClone = req.clone();
    const bodyText = await reqClone.text();
    const signature = req.headers.get('x-paystack-signature');

    if (!signature) {
      throw new Error("Missing x-paystack-signature header");
    }

    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: paystackGateway, error: gatewayError } = await supabaseService
      .from('payment_gateways')
      .select('secret_key')
      .eq('name', 'paystack')
      .single();

    if (gatewayError || !paystackGateway?.secret_key) {
      throw new Error("Paystack settings not found or secret key is missing.");
    }

    const encoder = new TextEncoder();
    const keyData = encoder.encode(paystackGateway.secret_key);
    const bodyData = encoder.encode(bodyText);

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-512" },
      false,
      ["sign"]
    );

    const signed = await crypto.subtle.sign("HMAC", cryptoKey, bodyData);
    const expectedSignature = bufferToHex(signed);

    if (expectedSignature !== signature) {
      console.error("Webhook signature verification failed.");
      return new Response("Signature verification failed", { status: 401 });
    }

    console.log("Webhook signature verified successfully.");
    const payload = JSON.parse(bodyText);

    if (payload.event === 'charge.success') {
      console.log("Processing successful charge event...");
      const { metadata, customer, reference, amount, currency } = payload.data;
      const { user_id, plan_id, plan_name, credits } = metadata;

      if (!user_id || !plan_id) {
        throw new Error("Missing user_id or plan_id in webhook metadata");
      }

      console.log(`Fulfilling order for user ${user_id}, plan ${plan_id}`);

      const subscriptionStartDate = new Date();
      const expiresAt = new Date(subscriptionStartDate);
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      await supabaseService
        .from('user_subscriptions')
        .update({ subscription_status: 'inactive' })
        .eq('user_id', user_id)
        .eq('subscription_status', 'active');

      await supabaseService
        .from('user_subscriptions')
        .upsert({
          user_id: user_id,
          subscription_type: plan_id,
          subscription_status: 'active',
          started_at: subscriptionStartDate.toISOString(),
          expires_at: expiresAt.toISOString(),
          stripe_subscription_id: `paystack-${reference}`,
          stripe_customer_id: `paystack-customer-${customer.id}`,
        }, { onConflict: 'user_id' });

      await supabaseService.from('user_roles').delete().eq('user_id', user_id).eq('role', 'voter');
      await supabaseService.from('user_roles').upsert({ user_id: user_id, role: 'subscriber' }, { onConflict: 'user_id,role' });

      await supabaseService.from('payment_transactions').insert({
        user_id: user_id,
        amount: amount / 100, // Convert from kobo/cents
        currency: currency,
        payment_method: 'paystack',
        status: 'completed',
        payment_id: reference,
        credits_purchased: credits || 0,
      });

      if (credits && credits > 0) {
        await supabaseService.rpc('update_user_credits', { p_user_id: user_id, p_amount: credits });
      }

      console.log(`Subscription for user ${user_id} successfully processed.`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
