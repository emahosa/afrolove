
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
        const subscriptionType = session.metadata?.subscription_type

        console.log('Checkout completed:', { userId, creditsAmount, subscriptionType })

        if (!userId) {
          console.error('No user_id in session metadata')
          return new Response('No user_id', { status: 400, headers: corsHeaders })
        }

        // Handle credit purchases
        if (creditsAmount > 0) {
          console.log(`Adding ${creditsAmount} credits to user ${userId}`)
          
          // Update user credits
          const { data: profileData, error: profileError } = await supabaseClient
            .from('profiles')
            .select('credits')
            .eq('id', userId)
            .single()

          if (profileError) {
            console.error('Error fetching user profile:', profileError)
            return new Response('Profile error', { status: 500, headers: corsHeaders })
          }

          const newCredits = (profileData?.credits || 0) + creditsAmount

          const { error: updateError } = await supabaseClient
            .from('profiles')
            .update({ credits: newCredits })
            .eq('id', userId)

          if (updateError) {
            console.error('Error updating credits:', updateError)
            return new Response('Update error', { status: 500, headers: corsHeaders })
          }

          // Log the transaction
          const { error: transactionError } = await supabaseClient
            .from('credit_transactions')
            .insert({
              user_id: userId,
              amount: creditsAmount,
              transaction_type: 'purchase',
              description: `Credits purchased via Stripe - ${creditsAmount} credits`
            })

          if (transactionError) {
            console.error('Error logging transaction:', transactionError)
          }

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

          console.log(`Successfully added ${creditsAmount} credits to user ${userId}`)
        }

        // Handle subscription purchases
        if (subscriptionType) {
          console.log(`Updating subscription for user ${userId} to ${subscriptionType}`)
          
          const expiresAt = new Date()
          expiresAt.setMonth(expiresAt.getMonth() + 1) // 1 month subscription

          // Update user subscription
          const { error: subscriptionError } = await supabaseClient
            .from('user_subscriptions')
            .upsert({
              user_id: userId,
              subscription_type: subscriptionType,
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
          }

          console.log(`Successfully updated subscription for user ${userId}`)
        }

        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object
        const subscriptionId = invoice.subscription
        
        console.log('Invoice payment succeeded:', subscriptionId)

        // Handle recurring subscription payments
        if (subscriptionId) {
          // Find user by subscription ID (you'll need to store this relationship)
          // Update subscription status and extend expiry
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object
        const subscriptionId = invoice.subscription
        
        console.log('Invoice payment failed:', subscriptionId)
        
        // Handle failed payments - maybe downgrade user
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
