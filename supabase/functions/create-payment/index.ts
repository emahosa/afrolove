
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

    // Check if Stripe is enabled - using service role key for reliable access
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

    let isStripeEnabled = true; // Default to enabled for safety
    
    if (!settingsError && stripeSettings?.value && typeof stripeSettings.value === 'object' && stripeSettings.value !== null) {
      const settingValue = stripeSettings.value as { enabled?: boolean };
      isStripeEnabled = settingValue.enabled === true;
      console.log('🔍 Stripe setting found:', settingValue);
    } else {
      console.log('🔍 No Stripe setting found or error:', settingsError);
    }

    console.log('🔍 Stripe enabled status:', isStripeEnabled);

    const { type, packId, amount, credits, description } = await req.json();

    // If Stripe is disabled, process payment automatically
    if (!isStripeEnabled) {
      console.log('💳 Stripe disabled - processing automatic payment');
      
      // Automatically add credits without payment
      const { data: newBalance, error: creditError } = await supabaseClient.rpc('update_user_credits', {
        p_user_id: user.id,
        p_amount: credits
      });

      if (creditError) {
        console.error('❌ Error updating credits:', creditError);
        throw new Error('Failed to add credits');
      }

      // Log the transaction
      const { error: transactionError } = await supabaseService
        .from('payment_transactions')
        .insert({
          user_id: user.id,
          amount: amount / 100, // Convert from cents
          currency: 'USD',
          payment_method: 'automatic',
          status: 'completed',
          payment_id: `auto-${Date.now()}`,
          credits_purchased: credits
        });

      if (transactionError) {
        console.error('❌ Error logging transaction:', transactionError);
      }

      console.log(`✅ Credits added automatically. New balance: ${newBalance}`);
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Credits added successfully',
        newBalance: newBalance 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Stripe is enabled - proceed with normal Stripe checkout
    console.log('💳 Stripe enabled - creating checkout session');
    
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { 
              name: description || `Credit Pack - ${credits} credits`,
              description: `${credits} credits for Afroverse`,
              metadata: {
                type: 'credits',
                amount: credits.toString()
              }
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/credits?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/credits?payment=canceled`,
      metadata: {
        type: 'credits',
        user_id: user.id,
        credits: credits.toString(),
        pack_id: packId,
        user_email: user.email
      }
    });

    console.log("Payment session created successfully:", session.id);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Payment creation error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
