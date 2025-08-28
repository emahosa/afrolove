
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
    console.log('=== STRIPE WEBHOOK STARTED ===')
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: "2023-10-16",
    })

    const signature = req.headers.get('stripe-signature')
    if (!signature) {
      console.error('❌ No Stripe signature found')
      return new Response('No signature', { status: 400, headers: corsHeaders })
    }

    const body = await req.text()
    const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
    
    let event
    try {
      event = stripe.webhooks.constructEvent(body, signature, endpointSecret || '')
      console.log('✅ Webhook event verified:', event.type, event.id)
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', err.message)
      return new Response(`Webhook Error: ${err.message}`, { status: 400, headers: corsHeaders })
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      console.log('🔄 Processing checkout session:', session.id)
      
      const userId = session.metadata?.user_id
      const paymentType = session.metadata?.type
      const creditsAmount = parseInt(session.metadata?.credits || '0')
      const planId = session.metadata?.plan_id
      const planName = session.metadata?.plan_name

      console.log('📋 Session metadata:', { userId, paymentType, creditsAmount, planId, planName })

      if (!userId) {
        console.error('❌ No user_id in session metadata')
        return new Response('No user_id in metadata', { status: 400, headers: corsHeaders })
      }

      // ALWAYS log the transaction first
      console.log('💾 Logging payment transaction...')
      const transactionData = {
        user_id: userId,
        amount: (session.amount_total || 0) / 100,
        currency: session.currency?.toUpperCase() || 'USD',
        payment_method: 'stripe',
        status: 'completed',
        payment_id: session.id,
        credits_purchased: creditsAmount || 0
      }

      const { error: transactionError } = await supabaseClient
        .from('payment_transactions')
        .insert(transactionData)

      if (transactionError) {
        console.error('❌ Error logging transaction:', transactionError)
      } else {
        console.log('✅ Transaction logged successfully:', transactionData)
      }

      // Handle credit purchases
      if (paymentType === 'credits' && creditsAmount > 0) {
        console.log(`💳 Processing credit purchase: ${creditsAmount} credits for user ${userId}`)
        
        try {
          // Update user credits using the RPC function
          const { data: newBalance, error: creditError } = await supabaseClient.rpc('update_user_credits', {
            p_user_id: userId,
            p_amount: creditsAmount
          })

          if (creditError) {
            console.error('❌ Error updating credits:', creditError)
            throw creditError
          }

          console.log(`✅ Credits updated successfully. New balance: ${newBalance}`)

        } catch (error) {
          console.error('❌ Failed to process credit purchase:', error)
          return new Response('Credit processing failed', { status: 500, headers: corsHeaders })
        }
      }

      // Handle subscription purchases
      if (paymentType === 'subscription' && planId && planName) {
        console.log(`🔄 Processing subscription for user ${userId} to plan ${planName} (${planId})`)
        
        try {
          const subscriptionStartDate = new Date()
          const expiresAt = new Date(subscriptionStartDate)
          expiresAt.setMonth(expiresAt.getMonth() + 1)

          const stripeSubscriptionId = session.subscription
          const stripeCustomerId = session.customer

          console.log('📅 Subscription details:', {
            stripeSubscriptionId,
            stripeCustomerId,
            expiresAt: expiresAt.toISOString()
          })

          // First, deactivate any existing subscriptions for this user
          console.log('🔄 Deactivating existing subscriptions...')
          const { error: deactivateError } = await supabaseClient
            .from('user_subscriptions')
            .update({ 
              subscription_status: 'inactive',
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userId)
            .eq('subscription_status', 'active')

          if (deactivateError) {
            console.error('⚠️  Error deactivating existing subscriptions:', deactivateError)
          } else {
            console.log('✅ Existing subscriptions deactivated')
          }

          // Upsert subscription record
          const subscriptionData = {
            user_id: userId,
            subscription_type: planId,
            subscription_status: 'active',
            started_at: subscriptionStartDate.toISOString(),
            expires_at: expiresAt.toISOString(),
            stripe_subscription_id: stripeSubscriptionId,
            stripe_customer_id: stripeCustomerId,
            updated_at: new Date().toISOString()
          }

          console.log('💾 Upserting subscription record:', subscriptionData)
          const { error: subError } = await supabaseClient
            .from('user_subscriptions')
            .upsert(subscriptionData, { onConflict: 'user_id' })

          if (subError) {
            console.error('❌ Error upserting subscription:', subError)
            throw subError
          }

          console.log('✅ Subscription created successfully')

          // Award credits for the subscription
          if (creditsAmount > 0) {
            console.log(`💰 Awarding ${creditsAmount} credits for subscription to user ${userId}`);
            const { error: creditError } = await supabaseClient.rpc('update_user_credits', {
              p_user_id: userId,
              p_amount: creditsAmount
            });

            if (creditError) {
              console.error('❌ Error adding credits for subscription:', creditError);
              // Don't throw here, as the subscription itself was successful
            } else {
                console.log('✅ Credits awarded successfully for subscription');
            }
          }

          // Update user roles - remove voter, add subscriber
          console.log('🔄 Updating user roles...')
          const { error: deleteRoleError } = await supabaseClient
            .from('user_roles')
            .delete()
            .eq('user_id', userId)
            .eq('role', 'voter')
          
          if (deleteRoleError) {
            console.error('⚠️  Error removing voter role:', deleteRoleError)
          }

          const { error: roleError } = await supabaseClient
            .from('user_roles')
            .upsert({ 
              user_id: userId, 
              role: 'subscriber' 
            }, { 
              onConflict: 'user_id,role' 
            })
          
          if (roleError) {
            console.error('⚠️  Error adding subscriber role:', roleError)
          } else {
            console.log('✅ User role updated to subscriber')
          }

        } catch (error) {
          console.error('❌ Failed to process subscription:', error)
          return new Response('Subscription processing failed', { status: 500, headers: corsHeaders })
        }
      }
      
      console.log('🎉 Checkout session processing completed successfully')
    }

    console.log('=== STRIPE WEBHOOK COMPLETED ===')
    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('💥 Webhook error:', error)
    return new Response(`Webhook error: ${error.message}`, {
      status: 500,
      headers: corsHeaders,
    })
  }
})
