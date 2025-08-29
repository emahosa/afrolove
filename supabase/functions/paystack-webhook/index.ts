import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { PaystackClient } from '../_shared/paystack.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-paystack-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('=== PAYSTACK WEBHOOK STARTED ===')

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const signature = req.headers.get('x-paystack-signature')
    if (!signature) {
      console.error('❌ No Paystack signature found')
      return new Response('No signature', { status: 400, headers: corsHeaders })
    }

    const body = await req.text()
    const secret = Deno.env.get('PAYSTACK_SECRET_KEY')

    if (!PaystackClient.verifyWebhookSignature(body, signature, secret || '')) {
        console.error('❌ Webhook signature verification failed.')
        return new Response('Invalid signature', { status: 401, headers: corsHeaders })
    }

    const event = JSON.parse(body)
    console.log('✅ Webhook event verified:', event.event, event.data.id)

    if (event.event === 'charge.success') {
      const chargeData = event.data
      console.log('🔄 Processing charge success event:', chargeData.reference)

      const metadata = chargeData.metadata || {}
      const userId = metadata.user_id
      const paymentType = metadata.type
      const creditsAmount = parseInt(metadata.credits || '0')
      const planId = metadata.plan_id
      const planName = metadata.plan_name

      console.log('📋 Event metadata:', { userId, paymentType, creditsAmount, planId, planName })

      if (!userId) {
        console.error('❌ No user_id in event metadata')
        return new Response('No user_id in metadata', { status: 400, headers: corsHeaders })
      }

      // ALWAYS log the transaction first
      console.log('💾 Logging payment transaction...')
      const transactionData = {
        user_id: userId,
        amount: (chargeData.amount || 0) / 100, // Amount is in kobo
        currency: chargeData.currency?.toUpperCase() || 'NGN',
        payment_method: 'paystack',
        status: 'completed',
        payment_id: chargeData.reference,
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
          const subscriptionStartDate = new Date(chargeData.paid_at)
          const expiresAt = new Date(subscriptionStartDate)
          expiresAt.setMonth(expiresAt.getMonth() + 1)

          const paystackSubscriptionCode = chargeData.authorization?.authorization_code
          const paystackCustomerCode = chargeData.customer?.customer_code

          console.log('📅 Subscription details:', {
            paystackSubscriptionCode,
            paystackCustomerCode,
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
            paystack_subscription_code: paystackSubscriptionCode,
            paystack_customer_code: paystackCustomerCode,
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
              console.error('❌ Error adding credits for subscription:', creditError)
            } else {
                console.log('✅ Credits awarded successfully for subscription');
            }
          }

          // Update user roles
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

      console.log('🎉 Charge success event processing completed successfully')
    }

    console.log('=== PAYSTACK WEBHOOK COMPLETED ===')
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
