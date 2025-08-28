import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import * as crypto from "https://deno.land/std@0.190.0/node/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  const supabaseService = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const signature = req.headers.get("x-paystack-signature");
    const body = await req.text();
    const secret = Deno.env.get("PAYSTACK_SECRET_KEY") || "";

    const hash = crypto.createHmac("sha512", secret).update(body).digest("hex");
    if (hash !== signature) {
      throw new Error("Invalid signature");
    }

    const event = JSON.parse(body);

    switch (event.event) {
      case "charge.success":
        // Handle successful payment
        const { metadata, amount, reference, customer } = event.data;
        if (metadata.credits) {
          // It's a credit purchase
          await supabaseService.rpc('update_user_credits', {
            p_user_id: metadata.user_id,
            p_amount: parseInt(metadata.credits)
          });

          await supabaseService.from("payment_transactions").insert({
            user_id: metadata.user_id,
            amount: amount / 100,
            currency: 'NGN', // Or get from event data
            payment_method: 'paystack',
            status: 'completed',
            payment_id: reference,
            credits_purchased: parseInt(metadata.credits),
          });

        } else if (metadata.plan_id) {
          // It's a subscription payment
          const subscriptionStartDate = new Date();
          const expiresAt = new Date(subscriptionStartDate);
          expiresAt.setMonth(expiresAt.getMonth() + 1);

          await supabaseService.from("user_subscriptions").insert({
            user_id: metadata.user_id,
            subscription_type: metadata.plan_id,
            subscription_status: 'active',
            started_at: subscriptionStartDate.toISOString(),
            expires_at: expiresAt.toISOString(),
            stripe_subscription_id: `paystack-${reference}`, // Using reference as a unique ID
            stripe_customer_id: `paystack-customer-${customer.customer_code}`,
          });

          await supabaseService.from("user_roles").upsert({
            user_id: metadata.user_id,
            role: 'subscriber'
          }, {
            onConflict: 'user_id,role'
          });
        }
        break;
      // Add other event handlers as needed
      // case "subscription.create":
      //   break;
      // case "subscription.disable":
      //   break;
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
