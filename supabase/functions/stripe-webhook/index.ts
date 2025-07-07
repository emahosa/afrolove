
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
          
          // Update user credits using direct SQL to avoid RPC issues
          const { error: creditError } = await supabaseClient
            .from('profiles')
            .update({ 
              credits: supabaseClient.sql`credits + ${creditsAmount}`,
              updated_at: new Date().toISOString()
            })
            .eq('id', userId)

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

          console.log(`Successfully added ${creditsAmount} credits to user ${userId}`)
        }

        // Handle subscription purchases
        if (paymentType === 'subscription' && planId && planName) {
          console.log(`Processing new subscription for user ${userId} to plan ${planName} (ID: ${planId})`)
          
          const subscriptionStartDate = new Date()
          // Determine expiration date based on plan details if available, otherwise default
          // For example, if Stripe session metadata included 'interval_count' and 'interval'
          const expiresAt = new Date(subscriptionStartDate)
          // Defaulting to 1 month. Real logic might use session.metadata.interval or query plan details
          expiresAt.setMonth(expiresAt.getMonth() + 1)

          // 1. Update/Insert into user_subscriptions
          const { error: subUpsertError } = await supabaseClient
            .from('user_subscriptions')
            .upsert({
              user_id: userId,
              subscription_type: planId, // Store the plan ID from Stripe
              subscription_status: 'active',
              started_at: subscriptionStartDate.toISOString(),
              expires_at: expiresAt.toISOString(),
              updated_at: new Date().toISOString(),
              // stripe_subscription_id: session.subscription, // Store Stripe subscription ID if available in session
            }, { onConflict: 'user_id' }) // Assuming a user has only one active subscription of this type

          if (subUpsertError) {
            console.error(`Error upserting user_subscriptions for user ${userId}:`, subUpsertError.message)
            return new Response('Failed to update user subscription details', { status: 500, headers: corsHeaders })
          }
          console.log(`Successfully upserted user_subscriptions for ${userId}. Expires: ${expiresAt.toISOString()}`)

          // 2. Update profiles table
          const { error: profileUpdateError } = await supabaseClient
            .from('profiles')
            .update({
              plan: planName, // Store the human-readable plan name
              plan_active: true,
              plan_expires_at: expiresAt.toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', userId)

          if (profileUpdateError) {
            console.error(`Error updating profiles table for user ${userId} after new subscription:`, profileUpdateError.message)
            // This is not ideal, but the subscription is recorded. Log and monitor.
          } else {
            console.log(`Successfully updated profiles for ${userId} with plan ${planName}.`)
          }

          // 3. Update user roles (if necessary)
          try {
            // Example: Remove 'free_user' role if it exists
            // await supabaseClient.from('user_roles').delete().match({ user_id: userId, role: 'free_user' });
            // Add 'subscriber' role
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
              payment_id: session.id, // Checkout session ID
              description: `New subscription: ${planName}`,
              credits_purchased: 0 // Assuming subscriptions don't grant one-time credits here
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
        // Extract plan name from the subscription items (assuming one item per subscription)
        // This might need adjustment if your Stripe setup is different
        const planNameFromStripe = stripeSubscription.items.data[0]?.price?.product?.name || 'Subscribed Plan'; // Fallback

        // Find user by Stripe customer ID
        const { data: userProfile, error: profileLookupError } = await supabaseClient
          .from('profiles')
          .select('id, plan') // Select plan to see if it changed (e.g. upgrade/downgrade)
          .eq('stripe_customer_id', stripeCustomerId)
          .single();

        if (profileLookupError || !userProfile) {
          console.error(`Profile not found for Stripe customer ${stripeCustomerId}. Error: ${profileLookupError?.message}`);
          return new Response('User profile not found.', { status: 404, headers: corsHeaders });
        }
        const userId = userProfile.id;

        // 1. Update user_subscriptions table
        const { error: subUpdateError } = await supabaseClient
          .from('user_subscriptions')
          .update({
            subscription_status: 'active',
            expires_at: newExpiresAt.toISOString(),
            // subscription_type: stripeSubscription.items.data[0]?.price?.id, // Update if plan ID can change
            updated_at: new Date().toISOString(),
            // stripe_subscription_id: stripeSubscriptionId, // Ensure it's stored
          })
          .eq('user_id', userId);
          // Ideally, match on stripe_subscription_id if you store it and it's reliable
          // .eq('stripe_subscription_id', stripeSubscriptionId);


        if (subUpdateError) {
          console.error(`Error updating user_subscriptions for user ${userId} on renewal:`, subUpdateError.message);
          // Potentially critical, as user_subscriptions might be out of sync.
        } else {
          console.log(`Successfully renewed user_subscriptions for ${userId} until ${newExpiresAt.toISOString()}.`);
        }

        // 2. Update profiles table
        const { error: profileUpdateError } = await supabaseClient
          .from('profiles')
          .update({
            plan: planNameFromStripe, // Update plan name in case it changed (upgrade/downgrade)
            plan_active: true,
            plan_expires_at: newExpiresAt.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        if (profileUpdateError) {
          console.error(`Error updating profiles for user ${userId} on renewal:`, profileUpdateError.message);
        } else {
          console.log(`Successfully updated profiles for ${userId} on renewal to plan ${planNameFromStripe}.`);
        }

        // 3. Log the renewal transaction
        const { error: transactionError } = await supabaseClient
            .from('payment_transactions')
            .insert({
              user_id: userId,
              amount: invoice.amount_paid / 100, // amount_paid should be available
              currency: invoice.currency?.toUpperCase() || 'USD',
              payment_method: 'stripe',
              status: 'completed',
              payment_id: invoice.id, // Use invoice ID for renewals
              description: `Subscription renewal: ${planNameFromStripe}`,
              credits_purchased: 0
            });
        if (transactionError) {
            console.error('Error logging renewal transaction:', transactionError.message);
        }

        console.log(`Subscription renewal for user ${userId} (plan: ${planNameFromStripe}) processed.`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        console.log(`Processing invoice.payment_failed: ${invoice.id} for subscription ${invoice.subscription}`);

        if (!invoice.subscription || !invoice.customer) {
          console.warn(`invoice.payment_failed ${invoice.id} missing subscription or customer ID. Skipping.`);
          return new Response('Missing subscription or customer ID in failed invoice.', { status: 400, headers: corsHeaders });
        }

        const stripeSubscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription.id;
        const stripeCustomerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer.id;
        
        // Find user by Stripe customer ID
        const { data: userProfile, error: profileLookupError } = await supabaseClient
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', stripeCustomerId)
          .single();

        if (profileLookupError || !userProfile) {
          console.error(`Profile not found for Stripe customer ${stripeCustomerId} on payment failure. Error: ${profileLookupError?.message}`);
          return new Response('User profile not found for payment failure.', { status: 404, headers: corsHeaders });
        }
        const userId = userProfile.id;

        // 1. Update user_subscriptions status
        // Status could be 'past_due', 'unpaid', or 'inactive' depending on Stripe settings and desired handling
        const { error: subUpdateError } = await supabaseClient
          .from('user_subscriptions')
          .update({
            subscription_status: 'payment_failed', // Or 'past_due' etc.
            updated_at: new Date().toISOString()
            // Consider if expires_at should be nulled or kept
          })
          .eq('user_id', userId);
          // .eq('stripe_subscription_id', stripeSubscriptionId); // If available


        if (subUpdateError) {
          console.error(`Error updating user_subscriptions for ${userId} on payment failure:`, subUpdateError.message);
        } else {
          console.log(`Marked user_subscriptions as 'payment_failed' for user ${userId}.`);
        }

        // 2. Update profiles table to reflect inactive plan
        const { error: profileUpdateError } = await supabaseClient
          .from('profiles')
          .update({
            plan_active: false,
            // plan: 'Free', // Optionally revert to a free plan
            // plan_expires_at: null, // Optionally clear expiry
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        if (profileUpdateError) {
          console.error(`Error deactivating plan in profiles for user ${userId}:`, profileUpdateError.message);
        } else {
          console.log(`Set plan_active=false in profiles for user ${userId}.`);
        }

        // 3. Log the failed payment attempt if necessary
        // This might be useful for internal tracking or alerting the user
        await supabaseClient
            .from('payment_transactions')
            .insert({
              user_id: userId,
              amount: invoice.amount_due / 100, // amount_due should be available
              currency: invoice.currency?.toUpperCase() || 'USD',
              payment_method: 'stripe',
              status: 'failed',
              payment_id: invoice.id,
              description: `Subscription payment failed`,
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
