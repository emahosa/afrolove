
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
        console.log(`[Stripe Webhook] Checkout session completed: ${session.id}, User ID: ${session.metadata?.user_id}, Type: ${session.metadata?.type}`);

        if (session.metadata?.type === 'credits') {
          const userId = session.metadata.user_id;
          const credits = parseInt(session.metadata.credits);
          
          if (!userId || isNaN(credits)) {
            console.error(`[Stripe Webhook] Invalid metadata for credit purchase: UserID=${userId}, Credits=${credits}`);
            return new Response("Invalid metadata for credit purchase", { status: 400 });
          }
          console.log(`[Stripe Webhook] Processing credit purchase for User ID: ${userId}, Credits: ${credits}`);
          
          const { data: rpcData, error: creditError } = await supabaseAdmin.rpc('update_user_credits', {
            p_user_id: userId,
            p_amount: credits
          });
          
          if (creditError) {
            console.error(`[Stripe Webhook] Error updating user credits for User ID ${userId}:`, creditError);
          } else {
            console.log(`[Stripe Webhook] Successfully updated user credits for User ID ${userId}. New balance: ${rpcData}`);
          }
          
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
            console.error(`[Stripe Webhook] Error recording transaction for User ID ${userId}:`, transactionError);
          } else {
            console.log(`[Stripe Webhook] Successfully recorded transaction for User ID ${userId}, Payment ID: ${session.id}`);
          }
          
        } else if (session.metadata?.type === 'subscription') {
          const userId = session.metadata.user_id;
          const planId = session.metadata.plan_id; // Assuming plan_id is more reliable for type
          const planName = session.metadata.plan_name; // For display/logging
          
          if (!userId || !planId || !planName) {
            console.error(`[Stripe Webhook] Invalid metadata for subscription: UserID=${userId}, PlanID=${planId}, PlanName=${planName}`);
            return new Response("Invalid metadata for subscription", { status: 400 });
          }
          console.log(`[Stripe Webhook] Processing subscription for User ID: ${userId}, Plan: ${planName} (${planId})`);
          
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
            console.error(`[Stripe Webhook] Error upserting user subscription for User ID ${userId}, Plan ${planName}:`, subError);
          } else {
            console.log(`[Stripe Webhook] Successfully upserted user subscription for User ID ${userId}, Plan ${planName}`);
            
            const { error: roleError } = await supabaseAdmin
              .from('user_roles')
              .upsert({ user_id: userId, role: 'subscriber' }); // Ensure 'subscriber' role
              
            if (roleError) {
              console.error(`[Stripe Webhook] Error upserting 'subscriber' role for User ID ${userId}:`, roleError);
            } else {
              console.log(`[Stripe Webhook] Successfully upserted 'subscriber' role for User ID ${userId}`);
            }

            // Also ensure 'voter' role is removed if 'subscriber' is added, or handle role hierarchy appropriately.
            // For now, just ensuring 'subscriber' is there. A more robust system might clear other conflicting roles.
            // Example: remove 'voter' if 'subscriber' is present.
            const { error: deleteVoterRoleError } = await supabaseAdmin
              .from('user_roles')
              .delete()
              .match({ user_id: userId, role: 'voter' });

            if (deleteVoterRoleError) {
              console.warn(`[Stripe Webhook] Could not remove 'voter' role for new subscriber ${userId}:`, deleteVoterRoleError);
            } else {
              console.log(`[Stripe Webhook] Removed 'voter' role for new subscriber ${userId} if it existed.`);
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
