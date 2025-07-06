
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    const signature = req.headers.get("stripe-signature");
    const body = await req.text();
    
    if (!signature) {
      throw new Error("No Stripe signature found");
    }

    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) {
      throw new Error("Stripe webhook secret not configured");
    }

    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    console.log(`Processing webhook event: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('Checkout session completed:', session.id, 'metadata:', session.metadata);

        if (session.metadata?.type === 'credits') {
          // Handle credit purchase
          const userId = session.metadata.user_id;
          const credits = parseInt(session.metadata.credits || '0');
          
          if (userId && credits > 0) {
            console.log(`Adding ${credits} credits to user ${userId}`);
            
            const { data, error } = await supabaseClient.rpc('update_user_credits', {
              p_user_id: userId,
              p_amount: credits
            });

            if (error) {
              console.error('Error updating credits:', error);
              throw error;
            }

            // Record the transaction
            await supabaseClient.from('payment_transactions').insert({
              user_id: userId,
              payment_id: session.id,
              amount: (session.amount_total || 0) / 100,
              credits_purchased: credits,
              status: 'completed',
              payment_method: 'stripe',
              currency: session.currency || 'usd'
            });

            console.log(`Successfully added ${credits} credits to user ${userId}. New balance: ${data}`);
          }
        } else if (session.metadata?.type === 'subscription') {
          // Handle subscription creation
          const userId = session.metadata.user_id;
          const planId = session.metadata.plan_id;
          
          if (userId && planId) {
            console.log(`Activating subscription for user ${userId}, plan ${planId}`);
            
            // Update user subscription status
            const { error: subError } = await supabaseClient
              .from('user_subscriptions')
              .upsert({
                user_id: userId,
                subscription_type: planId,
                subscription_status: 'active',
                started_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }, { onConflict: 'user_id' });

            if (subError) {
              console.error('Error updating subscription:', subError);
              throw subError;
            }

            // Remove voter role and add subscriber role
            await supabaseClient
              .from('user_roles')
              .delete()
              .eq('user_id', userId)
              .eq('role', 'voter');

            const { error: roleError } = await supabaseClient
              .from('user_roles')
              .upsert({
                user_id: userId,
                role: 'subscriber'
              }, { onConflict: 'user_id,role' });

            if (roleError) {
              console.error('Error adding subscriber role:', roleError);
            } else {
              console.log(`Successfully activated subscription for user ${userId}`);
            }
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('Subscription updated:', subscription.id);

        const { data: customer } = await stripe.customers.retrieve(subscription.customer as string);
        if (customer && !customer.deleted && customer.email) {
          const { data: profile } = await supabaseClient
            .from('profiles')
            .select('id')
            .eq('username', customer.email)
            .single();

          if (profile) {
            const isActive = subscription.status === 'active';
            
            await supabaseClient
              .from('user_subscriptions')
              .upsert({
                user_id: profile.id,
                subscription_status: isActive ? 'active' : 'inactive',
                expires_at: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
                updated_at: new Date().toISOString()
              }, { onConflict: 'user_id' });

            if (isActive) {
              await supabaseClient
                .from('user_roles')
                .delete()
                .eq('user_id', profile.id)
                .eq('role', 'voter');
              
              await supabaseClient
                .from('user_roles')
                .upsert({ user_id: profile.id, role: 'subscriber' }, { onConflict: 'user_id,role' });
            } else {
              await supabaseClient
                .from('user_roles')
                .delete()
                .eq('user_id', profile.id)
                .eq('role', 'subscriber');
              
              await supabaseClient
                .from('user_roles')
                .upsert({ user_id: profile.id, role: 'voter' }, { onConflict: 'user_id,role' });
            }
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('Subscription cancelled:', subscription.id);

        const { data: customer } = await stripe.customers.retrieve(subscription.customer as string);
        if (customer && !customer.deleted && customer.email) {
          const { data: profile } = await supabaseClient
            .from('profiles')
            .select('id')
            .eq('username', customer.email)
            .single();

          if (profile) {
            await supabaseClient
              .from('user_subscriptions')
              .update({
                subscription_status: 'inactive',
                updated_at: new Date().toISOString()
              })
              .eq('user_id', profile.id);

            await supabaseClient
              .from('user_roles')
              .delete()
              .eq('user_id', profile.id)
              .eq('role', 'subscriber');

            await supabaseClient
              .from('user_roles')
              .upsert({ user_id: profile.id, role: 'voter' }, { onConflict: 'user_id,role' });
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
