
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface StripeWebhookEvent {
  id: string
  type: string
  data: {
    object: any
  }
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

    const signature = req.headers.get('stripe-signature')
    
    if (!signature) {
      console.error('No Stripe signature found')
      return new Response('No signature', { status: 400, headers: corsHeaders })
    }

    const body = await req.text()
    const event = JSON.parse(body) as StripeWebhookEvent

    console.log(`Processing webhook event: ${event.type}`, event.id)

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const userId = session.metadata?.user_id
        const creditsAmount = parseInt(session.metadata?.credits || '0')
        const planId = session.metadata?.plan_id
        const planName = session.metadata?.plan_name

        console.log('Checkout completed:', { userId, creditsAmount, planId, planName })

        if (!userId) {
          console.error('No user_id in session metadata')
          return new Response('No user_id', { status: 400, headers: corsHeaders })
        }

        // Handle subscription purchases
        if (planId && planName) {
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
              expires_at: expiresAt.toISOString()
            })

          if (subscriptionError) {
            console.error('Error updating subscription:', subscriptionError)
            return new Response('Subscription error', { status: 500, headers: corsHeaders })
          }

          // Remove voter role and add subscriber role
          const { error: roleDeleteError } = await supabaseClient
            .from('user_roles')
            .delete()
            .eq('user_id', userId)
            .eq('role', 'voter')

          if (roleDeleteError) {
            console.error('Error removing voter role:', roleDeleteError)
          }

          const { error: roleInsertError } = await supabaseClient
            .from('user_roles')
            .upsert({
              user_id: userId,
              role: 'subscriber'
            })

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
              payment_id: session.payment_intent,
              credits_purchased: 0
            })

          if (subscriptionTransactionError) {
            console.error('Error logging subscription transaction:', subscriptionTransactionError)
          }

          console.log(`Successfully updated subscription for user ${userId}`)
        }

        // Handle credit purchases
        if (creditsAmount > 0) {
          console.log(`Adding ${creditsAmount} credits to user ${userId}`)
          
          // Update user credits using RPC function
          const { data: newCredits, error: creditsError } = await supabaseClient
            .rpc('update_user_credits', {
              p_user_id: userId,
              p_amount: creditsAmount
            })

          if (creditsError) {
            console.error('Error updating credits:', creditsError)
            return new Response('Credits update error', { status: 500, headers: corsHeaders })
          }

          console.log(`Successfully updated credits for user ${userId}. New balance: ${newCredits}`)

          // Log payment transaction
          const { error: paymentError } = await supabaseClient
            .from('payment_transactions')
            .insert({
              user_id: userId,
              amount: session.amount_total / 100,
              currency: session.currency?.toUpperCase() || 'USD',
              payment_method: 'stripe',
              status: 'completed',
              payment_id: session.payment_intent,
              credits_purchased: creditsAmount
            })

          if (paymentError) {
            console.error('Error logging payment:', paymentError)
          }
        }

        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object
        const subscriptionId = invoice.subscription
        
        console.log('Invoice payment succeeded:', subscriptionId)

        if (subscriptionId) {
          // Find the user by subscription metadata or customer ID
          const customerId = invoice.customer
          
          // You would need to store the Stripe customer ID in your user profiles
          // For now, we'll log this for debugging
          console.log('Recurring payment succeeded for customer:', customerId)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object
        const subscriptionId = invoice.subscription
        
        console.log('Invoice payment failed:', subscriptionId)
        
        // Handle failed payments - maybe downgrade user or send notification
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
