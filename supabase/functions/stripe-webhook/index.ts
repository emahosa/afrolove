
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

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    const body = await req.text();
    const sig = req.headers.get("stripe-signature");
    
    let event;
    try {
      event = stripe.webhooks.constructEvent(body, sig!, Deno.env.get("STRIPE_WEBHOOK_SECRET") || "");
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    console.log("Processing webhook event:", event.type);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("Checkout session completed:", session.id);

        if (session.metadata?.type === 'credits') {
          // Handle credit purchase
          const userId = session.metadata.user_id;
          const credits = parseInt(session.metadata.credits);
          
          console.log("Processing credit purchase:", { userId, credits });
          
          // Update user credits
          const { error: creditError } = await supabaseAdmin.rpc('update_user_credits', {
            p_user_id: userId,
            p_amount: credits
          });
          
          if (creditError) {
            console.error("Error updating user credits:", creditError);
          } else {
            console.log("Successfully updated user credits");
          }
          
          // Record transaction
          const { error: transactionError } = await supabaseAdmin
            .from('payment_transactions')
            .insert({
              user_id: userId,
              payment_id: session.id,
              amount: session.amount_total! / 100,
              credits_purchased: credits,
              status: 'completed',
              payment_method: 'stripe'
            });
            
          if (transactionError) {
            console.error("Error recording transaction:", transactionError);
          }
          
        } else if (session.metadata?.type === 'subscription') {
          // Handle subscription purchase
          const userId = session.metadata.user_id;
          const planName = session.metadata.plan_name;
          
          console.log("Processing subscription:", { userId, planName });
          
          // Update user subscription
          const { error: subError } = await supabaseAdmin
            .from('user_subscriptions')
            .upsert({
              user_id: userId,
              subscription_type: planName.toLowerCase(),
              subscription_status: 'active',
              started_at: new Date().toISOString(),
              expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
            });
            
          if (subError) {
            console.error("Error updating subscription:", subError);
          } else {
            console.log("Successfully updated subscription");
            
            // Add subscriber role
            const { error: roleError } = await supabaseAdmin
              .from('user_roles')
              .upsert({
                user_id: userId,
                role: 'subscriber'
              });
              
            if (roleError) {
              console.error("Error adding subscriber role:", roleError);
            }
          }
        }
        break;
      }
      
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        // Find user by customer ID
        const { data: customer } = await stripe.customers.retrieve(customerId);
        if (customer && !customer.deleted && customer.email) {
          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('username', customer.email)
            .single();
            
          if (profile) {
            const status = subscription.status === 'active' ? 'active' : 'inactive';
            
            // Update subscription status
            const { error } = await supabaseAdmin
              .from('user_subscriptions')
              .update({
                subscription_status: status,
                expires_at: status === 'active' ? 
                  new Date(subscription.current_period_end * 1000).toISOString() : 
                  new Date().toISOString()
              })
              .eq('user_id', profile.id);
              
            if (error) {
              console.error("Error updating subscription status:", error);
            }
            
            // Update user role
            if (status === 'inactive') {
              await supabaseAdmin
                .from('user_roles')
                .delete()
                .eq('user_id', profile.id)
                .eq('role', 'subscriber');
                
              await supabaseAdmin
                .from('user_roles')
                .upsert({
                  user_id: profile.id,
                  role: 'voter'
                });
            }
          }
        }
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
    
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
