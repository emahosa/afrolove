
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from "https://esm.sh/stripe@14.21.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: "2023-10-16",
    })

    const signature = req.headers.get('stripe-signature')
    
    if (!signature) {
      console.error('No Stripe signature found')
      return new Response('No signature', { status: 400, headers: corsHeaders })
    }

    const body = await req.text()
    const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
    
    let event
    try {
      event = stripe.webhooks.constructEvent(body, signature, endpointSecret || '')
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message)
      return new Response(`Webhook Error: ${err.message}`, { status: 400, headers: corsHeaders })
    }

    console.log(`Processing webhook event: ${event.type}`, event.id)

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        console.log('Processing checkout session:', session.id)
        
        // Extract metadata
        const userId = session.metadata?.user_id
        const paymentType = session.metadata?.type
        const creditsAmount = parseInt(session.metadata?.credits || '0')
        const planId = session.metadata?.plan_id
        const planName = session.metadata?.plan_name

        console.log('Session metadata:', { userId, paymentType, creditsAmount, planId, planName })

        if (!userId) {
          console.error('No user_id in session metadata')
          return new Response('No user_id in metadata', { status: 400, headers: corsHeaders })
        }

        // Handle credit purchases
        if (paymentType === 'credits' && creditsAmount > 0) {
          console.log(`Processing credit purchase: ${creditsAmount} credits for user ${userId}`)
          
          // Update user credits using RPC function
          const { data: newBalance, error: creditError } = await supabaseClient.rpc('update_user_credits', {
            p_user_id: userId,
            p_amount: creditsAmount
          })

          if (creditError) {
            console.error('Error updating credits:', creditError)
            return new Response('Credits update error', { status: 500, headers: corsHeaders })
          }

          // Log the transaction
          const { error: transactionError } = await supabaseClient
            .from('payment_transactions')
            .insert({
              user_id: userId,
              amount: session.amount_total / 100,
              currency: session.currency?.toUpperCase() || 'USD',
              payment_method: 'stripe',
              status: 'completed',
              payment_id: session.id,
              credits_purchased: creditsAmount
            })

          if (transactionError) {
            console.error('Error logging transaction:', transactionError)
          }

          console.log(`Successfully added ${creditsAmount} credits to user ${userId}, new balance: ${newBalance}`)
        }

        // Handle subscription purchases
        if (paymentType === 'subscription' && planId && planName) {
          console.log(`Processing new subscription for user ${userId} to plan ${planName} (ID: ${planId})`)
          
          const subscriptionStartDate = new Date()
          const expiresAt = new Date(subscriptionStartDate)
          expiresAt.setMonth(expiresAt.getMonth() + 1)

          // Get customer ID for future reference
          const stripeCustomerId = session.customer || session.customer_email

          // 1. Update/Insert into user_subscriptions
          const { error: subUpsertError } = await supabaseClient
            .from('user_subscriptions')
            .upsert({
              user_id: userId,
              subscription_type: planId,
              subscription_status: 'active',
              started_at: subscriptionStartDate.toISOString(),
              expires_at: expiresAt.toISOString(),
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' })

          if (subUpsertError) {
            console.error(`Error upserting user_subscriptions for user ${userId}:`, subUpsertError.message)
            return new Response('Failed to update user subscription details', { status: 500, headers: corsHeaders })
          }
          console.log(`Successfully upserted user_subscriptions for ${userId}. Expires: ${expiresAt.toISOString()}`)

          // 2. Update profiles table with stripe customer ID
          const { error: profileUpdateError } = await supabaseClient
            .from('profiles')
            .update({
              updated_at: new Date().toISOString()
            })
            .eq('id', userId)

          if (profileUpdateError) {
            console.error(`Error updating profiles table for user ${userId}:`, profileUpdateError.message)
          } else {
            console.log(`Successfully updated profiles for ${userId}.`)
          }

          // 3. Update user roles - remove voter, add subscriber
          try {
            await supabaseClient.from('user_roles').delete().match({ user_id: userId, role: 'voter' });
            
            const { error: roleInsertError } = await supabaseClient
              .from('user_roles')
              .upsert({ user_id: userId, role: 'subscriber' }, { onConflict: 'user_id,role' })
            
            if (roleInsertError) throw roleInsertError;
            console.log(`Ensured 'subscriber' role for user ${userId}.`)
          } catch (roleError) {
            console.error(`Error managing roles for user ${userId}:`, roleError.message)
          }

          // 4. Log the transaction
          const { error: transactionError } = await supabaseClient
            .from('payment_transactions')
            .insert({
              user_id: userId,
              amount: session.amount_total ? session.amount_total / 100 : 0,
              currency: session.currency?.toUpperCase() || 'USD',
              payment_method: 'stripe',
              status: 'completed',
              payment_id: session.id,
              credits_purchased: 0
            })

          if (transactionError) {
            console.error('Error logging new subscription transaction:', transactionError.message)
          }
          console.log(`New subscription for user ${userId} to ${planName} processed successfully.`)
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        console.log(`Processing invoice.payment_succeeded: ${invoice.id} for subscription ${invoice.subscription}`);

        if (!invoice.subscription || !invoice.customer) {
          console.warn(`invoice.payment_succeeded ${invoice.id} missing subscription or customer ID. Skipping.`);
          return new Response('Missing subscription or customer ID in invoice.', { status: 400, headers: corsHeaders });
        }
        
        const stripeSubscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription.id;
        const stripeCustomerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer.id;

        // Retrieve the subscription from Stripe to get the current period end and plan details
        let stripeSubscription;
        try {
          stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
        } catch (stripeError) {
          console.error(`Failed to retrieve Stripe subscription ${stripeSubscriptionId}:`, stripeError.message);
          return new Response(`Stripe API error: ${stripeError.message}`, { status: 500, headers: corsHeaders });
        }

        const newExpiresAt = new Date(stripeSubscription.current_period_end * 1000);
        const planNameFromStripe = stripeSubscription.items.data[0]?.price?.nickname || 'Subscribed Plan';

        // Find user by matching subscription in user_subscriptions table
        const { data: userSubscription, error: subLookupError } = await supabaseClient
          .from('user_subscriptions')
          .select('user_id')
          .eq('subscription_status', 'active')
          .single();

        if (subLookupError || !userSubscription) {
          console.error(`User subscription not found for Stripe subscription ${stripeSubscriptionId}`);
          return new Response('User subscription not found.', { status: 404, headers: corsHeaders });
        }
        
        const userId = userSubscription.user_id;

        // Update user_subscriptions table
        const { error: subUpdateError } = await supabaseClient
          .from('user_subscriptions')
          .update({
            subscription_status: 'active',
            expires_at: newExpiresAt.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        if (subUpdateError) {
          console.error(`Error updating user_subscriptions for user ${userId} on renewal:`, subUpdateError.message);
        } else {
          console.log(`Successfully renewed user_subscriptions for ${userId} until ${newExpiresAt.toISOString()}.`);
        }

        // Log the renewal transaction
        const { error: transactionError } = await supabaseClient
            .from('payment_transactions')
            .insert({
              user_id: userId,
              amount: invoice.amount_paid / 100,
              currency: invoice.currency?.toUpperCase() || 'USD',
              payment_method: 'stripe',
              status: 'completed',
              payment_id: invoice.id,
              credits_purchased: 0
            });
        
        if (transactionError) {
            console.error('Error logging renewal transaction:', transactionError.message);
        }

        console.log(`Subscription renewal for user ${userId} processed.`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        console.log(`Processing invoice.payment_failed: ${invoice.id} for subscription ${invoice.subscription}`);

        if (!invoice.subscription || !invoice.customer) {
          console.warn(`invoice.payment_failed ${invoice.id} missing subscription or customer ID. Skipping.`);
          return new Response('Missing subscription or customer ID in failed invoice.', { status: 400, headers: corsHeaders });
        }

        // Find user by subscription and update status
        const { data: userSubscription, error: subLookupError } = await supabaseClient
          .from('user_subscriptions')
          .select('user_id')
          .eq('subscription_status', 'active')
          .single();

        if (subLookupError || !userSubscription) {
          console.error(`User subscription not found for payment failure`);
          return new Response('User subscription not found for payment failure.', { status: 404, headers: corsHeaders });
        }
        
        const userId = userSubscription.user_id;

        // Update user_subscriptions status
        const { error: subUpdateError } = await supabaseClient
          .from('user_subscriptions')
          .update({
            subscription_status: 'payment_failed',
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);

        if (subUpdateError) {
          console.error(`Error updating user_subscriptions for ${userId} on payment failure:`, subUpdateError.message);
        } else {
          console.log(`Marked user_subscriptions as 'payment_failed' for user ${userId}.`);
        }

        // Log the failed payment attempt
        await supabaseClient
            .from('payment_transactions')
            .insert({
              user_id: userId,
              amount: invoice.amount_due / 100,
              currency: invoice.currency?.toUpperCase() || 'USD',
              payment_method: 'stripe',
              status: 'failed',
              payment_id: invoice.id,
              credits_purchased: 0
            });

        console.log(`Subscription payment failure for user ${userId} processed.`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(`Webhook error: ${error.message}`, {
      status: 400,
      headers: corsHeaders,
    })
  }
})
