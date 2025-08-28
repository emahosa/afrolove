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

    // --- Handle Successful Charge ---
    if (event.event === "charge.success") {
      const { data } = event;
      const metadata = data.metadata;
      const userId = metadata?.user_id;

      if (!userId) {
        throw new Error("Missing user_id in webhook metadata");
      }

      console.log('✅ Processing successful charge:', data.reference);

      // Log the transaction
      await supabaseService.from('payment_transactions').insert({
        user_id: userId,
        amount: data.amount / 100,
        currency: data.currency,
        payment_method: 'paystack',
        status: 'completed',
        payment_id: data.reference,
        credits_purchased: metadata?.credits || 0,
      });

      // Handle Credit Purchase
      if (metadata.type === 'credits') {
        const credits = metadata?.credits;
        if (!credits) throw new Error("Missing credits in webhook metadata for credit purchase");
        console.log(`💳 Processing credit purchase for user ${userId}, credits: ${credits}`);
        await supabaseService.rpc('update_user_credits', { p_user_id: userId, p_amount: credits });
      }

      // Handle Subscription Purchase
      if (metadata.type === 'subscription') {
        const { plan_id, plan_name, credits } = metadata;
        console.log(`🔄 Processing subscription for user ${userId} to plan ${plan_name} (${plan_id})`);

        const subscriptionStartDate = new Date();
        const expiresAt = new Date(subscriptionStartDate);
        expiresAt.setMonth(expiresAt.getMonth() + 1);

        // Deactivate existing subscriptions
        await supabaseService.from('user_subscriptions').update({ subscription_status: 'inactive' }).eq('user_id', userId);

        // Upsert new subscription
        await supabaseService.from('user_subscriptions').upsert({
          user_id: userId,
          subscription_type: plan_id,
          subscription_status: 'active',
          started_at: subscriptionStartDate.toISOString(),
          expires_at: expiresAt.toISOString(),
          paystack_subscription_code: data.authorization.authorization_code,
          paystack_customer_code: data.customer.customer_code,
        }, { onConflict: 'user_id' });

        // Update user roles
        await supabaseService.from('user_roles').delete().eq('user_id', userId).eq('role', 'voter');
        await supabaseService.from('user_roles').upsert({ user_id: userId, role: 'subscriber' }, { onConflict: 'user_id,role' });

        // Grant credits that come with the subscription
        if (credits && credits > 0) {
          await supabaseService.rpc('update_user_credits', { p_user_id: userId, p_amount: credits });
        }
      }
    }

    // --- Handle Subscription Disabled ---
    if (event.event === 'subscription.disable') {
        const { customer, subscription_code } = event.data;
        const customerCode = customer.customer_code;

        console.log(`🚫 Subscription disabled for customer ${customerCode}, subscription code: ${subscription_code}`);

        // Find the subscription by customer code and deactivate it
        const { data: sub, error } = await supabaseService
            .from('user_subscriptions')
            .update({ subscription_status: 'inactive', updated_at: new Date().toISOString() })
            .eq('paystack_customer_code', customerCode)
            .select();

        if (error) {
            console.error('❌ Error deactivating subscription:', error);
        } else if (sub && sub.length > 0) {
            const userId = sub[0].user_id;
            // Remove subscriber role
            await supabaseService.from('user_roles').delete().eq('user_id', userId).eq('role', 'subscriber');
            console.log(`✅ Subscription deactivated for user ${userId}`);
        }
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
