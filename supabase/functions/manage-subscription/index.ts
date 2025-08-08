import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
});

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

    const { priceId, planId, planName } = await req.json();
    if (!priceId || !planId || !planName) {
      throw new Error("priceId, planId, and planName are required");
    }

    const supabaseService = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Get the user's current active subscription
    const { data: activeSubscription, error: subscriptionError } = await supabaseService
      .from('user_subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', user.id)
      .eq('subscription_status', 'active')
      .single();

    if (subscriptionError || !activeSubscription) {
      throw new Error("No active subscription found to update.");
    }

    const { stripe_subscription_id } = activeSubscription;

    // 2. Retrieve the subscription from Stripe to get the subscription item ID
    const subscription = await stripe.subscriptions.retrieve(stripe_subscription_id);
    const currentItemId = subscription.items.data[0].id;

    // 3. Update the subscription in Stripe
    const updatedSubscription = await stripe.subscriptions.update(stripe_subscription_id, {
      items: [{
        id: currentItemId,
        price: priceId,
      }],
      proration_behavior: 'create_prorations',
    });

    // 4. Update the subscription in the local database
    const { error: dbUpdateError } = await supabaseService
      .from('user_subscriptions')
      .update({
        subscription_type: planId,
        stripe_price_id: priceId,
        updated_at: new Date().toISOString(),
        expires_at: new Date(updatedSubscription.current_period_end * 1000).toISOString(),
      })
      .eq('stripe_subscription_id', stripe_subscription_id);

    if (dbUpdateError) {
      // If this fails, we have an inconsistency between Stripe and our DB.
      // This should be logged for manual intervention.
      console.error("Critical: Failed to update subscription in local DB:", dbUpdateError);
      throw new Error("Subscription updated in Stripe, but failed to update locally. Please contact support.");
    }

    return new Response(JSON.stringify({ success: true, message: 'Subscription updated successfully' }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Manage subscription error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
