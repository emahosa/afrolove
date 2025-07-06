
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
          console.log(`Processing subscription for user ${userId} to ${planName}`)
          
          const expiresAt = new Date()
          expiresAt.setMonth(expiresAt.getMonth() + 1) // 1 month subscription

          // Update user subscription
          const { error: subscriptionError } = await supabaseClient
            .from('user_subscriptions')
            .upsert({
              user_id: userId,
              subscription_type: planId,
              subscription_status: 'active',
              started_at: new Date().toISOString(),
              expires_at: expiresAt.toISOString(),
              updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' })

          if (subscriptionError) {
            console.error('Error updating subscription:', subscriptionError)
            return new Response('Subscription error', { status: 500, headers: corsHeaders })
          }

          // Update user roles - remove voter, add subscriber
          const { error: roleDeleteError } = await supabaseClient
            .from('user_roles')
            .delete()
            .eq('user_id', userId)
            .eq('role', 'voter')

          const { error: roleInsertError } = await supabaseClient
            .from('user_roles')
            .upsert({
              user_id: userId,
              role: 'subscriber'
            }, { onConflict: 'user_id,role' })

          if (roleInsertError) {
            console.error('Error adding subscriber role:', roleInsertError)
          } else {
            console.log(`Successfully added subscriber role to user ${userId}`)
          }

          // Log subscription transaction
          const { error: subscriptionTransactionError } = await supabaseClient
            .from('payment_transactions')
            .insert({
              user_id: userId,
              amount: session.amount_total / 100,
              currency: session.currency?.toUpperCase() || 'USD',
              payment_method: 'stripe',
              status: 'completed',
              payment_id: session.id,
              credits_purchased: 0
            })

          if (subscriptionTransactionError) {
            console.error('Error logging subscription transaction:', subscriptionTransactionError)
          }

          console.log(`Successfully updated subscription for user ${userId}`)
        }

        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object
        console.log('Invoice payment succeeded:', invoice.id)
        
        // Handle recurring subscription payments
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription)
          const customerId = subscription.customer
          
          // Find user by Stripe customer ID
          const { data: profile } = await supabaseClient
            .from('profiles')
            .select('id')
            .eq('stripe_customer_id', customerId)
            .single()
          
          if (profile) {
            // Extend subscription
            const expiresAt = new Date()
            expiresAt.setMonth(expiresAt.getMonth() + 1)
            
            await supabaseClient
              .from('user_subscriptions')
              .update({
                subscription_status: 'active',
                expires_at: expiresAt.toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('user_id', profile.id)
            
            console.log(`Extended subscription for user ${profile.id}`)
          }
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object
        console.log('Invoice payment failed:', invoice.id)
        
        // Handle failed subscription payments
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription)
          const customerId = subscription.customer
          
          // Find user by Stripe customer ID
          const { data: profile } = await supabaseClient
            .from('profiles')
            .select('id')
            .eq('stripe_customer_id', customerId)
            .single()
          
          if (profile) {
            // Mark subscription as inactive
            await supabaseClient
              .from('user_subscriptions')
              .update({
                subscription_status: 'inactive',
                updated_at: new Date().toISOString()
              })
              .eq('user_id', profile.id)
            
            console.log(`Deactivated subscription for user ${profile.id}`)
          }
        }
        break
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
