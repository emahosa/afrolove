
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
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

    console.log('🔍 Checking Stripe settings...');

    // Check if Stripe is enabled
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: stripeSettings, error: settingsError } = await supabaseService
      .from('system_settings')
      .select('value')
      .eq('key', 'stripe_enabled')
      .maybeSingle();

    let isStripeEnabled = true;
    
    if (!settingsError && stripeSettings?.value && typeof stripeSettings.value === 'object') {
      const settingValue = stripeSettings.value as { enabled?: boolean };
      isStripeEnabled = settingValue.enabled === true;
    }

    const { action, subscriptionId } = await req.json();

    if (!isStripeEnabled) {
      // Handle subscription management without Stripe
      if (action === 'cancel') {
        const { error: updateError } = await supabaseService
          .from('user_subscriptions')
          .update({
            subscription_status: 'inactive',
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .eq('subscription_status', 'active');

        if (updateError) {
          throw new Error('Failed to cancel subscription');
        }

        // Update user role
        await supabaseService
          .from('user_roles')
          .delete()
          .eq('user_id', user.id)
          .eq('role', 'subscriber');

        await supabaseService
          .from('user_roles')
          .upsert({
            user_id: user.id,
            role: 'voter'
          }, {
            onConflict: 'user_id,role'
          });

        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Subscription cancelled successfully' 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Subscription managed successfully' 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Handle with Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    if (action === 'cancel') {
      await stripe.subscriptions.cancel(subscriptionId);
      
      // Update local subscription status
      const { error: updateError } = await supabaseService
        .from('user_subscriptions')
        .update({
          subscription_status: 'inactive',
          updated_at: new Date().toISOString()
        })
        .eq('stripe_subscription_id', subscriptionId)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating subscription status:', updateError);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Subscription managed successfully' 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Subscription management error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
