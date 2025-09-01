
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from "https://esm.sh/stripe@14.21.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('=== STRIPE WEBHOOK STARTED ===')

    const signature = req.headers.get('stripe-signature')
    if (!signature) {
      console.error('No stripe signature found')
      return new Response('No signature', { status: 400 })
    }

    const body = await req.text()
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', { apiVersion: "2023-10-16" })

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, Deno.env.get('STRIPE_WEBHOOK_SECRET') || '')
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return new Response('Invalid signature', { status: 400 })
    }

    console.log('Event type:', event.type)

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        console.log('Processing checkout session:', session.id)
        
        const userId = session.metadata?.user_id
        const type = session.metadata?.type
        const credits = parseInt(session.metadata?.credits || '0')
        const planId = session.metadata?.plan_id
        const planName = session.metadata?.plan_name

        if (!userId) {
          console.error('No user_id found in session metadata')
          break
        }

        // Log the payment transaction
        const { error: transactionError } = await supabaseClient
          .from('payment_transactions')
          .insert({
            user_id: userId,
            amount: (session.amount_total || 0) / 100,
            currency: session.currency?.toUpperCase() || 'USD',
            payment_method: 'stripe',
            status: 'completed',
            payment_id: session.id,
            credits_purchased: type === 'credits' ? credits : 0
          })

        if (transactionError) {
          console.error('Error logging transaction:', transactionError)
        }

        if (type === 'credits' && credits > 0) {
          console.log(`Adding ${credits} credits to user ${userId}`)
          
          // Update user credits using the RPC function
          const { data: newBalance, error: creditError } = await supabaseClient.rpc('update_user_credits', {
            p_user_id: userId,
            p_amount: credits
          })

          if (creditError) {
            console.error('Error updating credits:', creditError)
          } else {
            console.log(`Credits updated successfully. New balance: ${newBalance}`)
          }
        }

        if (type === 'subscription' && planId && planName) {
          console.log(`Processing subscription for user ${userId}, plan: ${planName}`)
          
          const subscriptionStartDate = new Date()
          const expiresAt = new Date(subscriptionStartDate)
          expiresAt.setMonth(expiresAt.getMonth() + 1)

          // Get the Stripe subscription ID
          let stripeSubId = null
          if (session.subscription) {
            stripeSubId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id
          }

          // Deactivate existing subscriptions
          const { error: deactivateError } = await supabaseClient
            .from('user_subscriptions')
            .update({ 
              subscription_status: 'inactive',
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userId)
            .eq('subscription_status', 'active')

          if (deactivateError) {
            console.error('Error deactivating existing subscriptions:', deactivateError)
          }

          // Create new subscription record
          const { error: subError } = await supabaseClient
            .from('user_subscriptions')
            .insert({
              user_id: userId,
              subscription_type: planId,
              subscription_status: 'active',
              started_at: subscriptionStartDate.toISOString(),
              expires_at: expiresAt.toISOString(),
              stripe_subscription_id: stripeSubId,
              stripe_customer_id: typeof session.customer === 'string' ? session.customer : session.customer?.id,
              payment_provider: 'stripe',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })

          if (subError) {
            console.error('Error creating subscription:', subError)
          } else {
            console.log('Subscription created successfully')
            
            // Add subscription credits if any
            if (credits > 0) {
              console.log(`Adding ${credits} subscription credits to user ${userId}`)
              
              const { data: newBalance, error: creditError } = await supabaseClient.rpc('update_user_credits', {
                p_user_id: userId,
                p_amount: credits
              })

              if (creditError) {
                console.error('Error adding subscription credits:', creditError)
              } else {
                console.log(`Subscription credits added. New balance: ${newBalance}`)
              }
            }

            // Update user roles
            await supabaseClient
              .from('user_roles')
              .delete()
              .eq('user_id', userId)
              .eq('role', 'voter')

            const { error: roleError } = await supabaseClient
              .from('user_roles')
              .upsert({ user_id: userId, role: 'subscriber' }, { onConflict: 'user_id,role' })

            if (roleError) {
              console.error('Error updating user role:', roleError)
            } else {
              console.log('User role updated to subscriber')
            }
          }
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        console.log('Processing successful payment for invoice:', invoice.id)
        
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription.id
          )
          
          // Find the user subscription record
          const { data: userSub } = await supabaseClient
            .from('user_subscriptions')
            .select('user_id, subscription_type')
            .eq('stripe_subscription_id', subscription.id)
            .single()

          if (userSub) {
            console.log(`Recurring payment processed for user ${userSub.user_id}`)
            
            // Get plan details to add monthly credits
            const { data: plan } = await supabaseClient
              .from('plans')
              .select('credits_per_month')
              .eq('id', userSub.subscription_type)
              .single()

            if (plan && plan.credits_per_month > 0) {
              console.log(`Adding ${plan.credits_per_month} monthly credits to user ${userSub.user_id}`)
              
              const { data: newBalance, error: creditError } = await supabaseClient.rpc('update_user_credits', {
                p_user_id: userSub.user_id,
                p_amount: plan.credits_per_month
              })

              if (creditError) {
                console.error('Error adding monthly credits:', creditError)
              } else {
                console.log(`Monthly credits added. New balance: ${newBalance}`)
              }
            }
          }
        }
        break
      }

      default:
        console.log('Unhandled event type:', event.type)
    }

    console.log('=== STRIPE WEBHOOK COMPLETED ===')
    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Stripe webhook error:', error)
    return new Response(`Webhook error: ${error.message}`, {
      status: 500,
      headers: corsHeaders,
    })
  }
})
