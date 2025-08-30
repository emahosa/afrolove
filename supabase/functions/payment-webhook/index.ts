import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
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
      console.error('Paystack webhook error: No signature found')
      return new Response('No signature', { status: 400, headers: corsHeaders })
    }

    const body = await req.text()
    const secret = Deno.env.get('PAYSTACK_SECRET_KEY')

    if (!PaystackClient.verifyWebhookSignature(body, signature, secret || '')) {
        console.error('Paystack webhook error: Webhook signature verification failed.')
        return new Response('Invalid signature', { status: 401, headers: corsHeaders })
    }

    const event = JSON.parse(body)

    if (event.event === 'charge.success') {
      const chargeData = event.data
      const metadata = chargeData.metadata || {}
      const userId = metadata.user_id
      const paymentType = metadata.type
      const creditsAmount = parseInt(metadata.credits || '0')
      const planId = metadata.plan_id
      const planName = metadata.plan_name

      if (!userId) {
        console.error('Paystack webhook error: No user_id in event metadata', metadata)
        return new Response('No user_id in metadata', { status: 400, headers: corsHeaders })
      }

      // Log the transaction
      const { error: transactionError } = await supabaseClient
        .from('payment_transactions')
        .insert({
          user_id: userId,
          amount: (chargeData.amount || 0) / 100,
          currency: chargeData.currency?.toUpperCase() || 'NGN',
          payment_method: 'paystack',
          status: 'completed',
          payment_id: chargeData.reference,
          credits_purchased: creditsAmount || 0
        })

      if (transactionError) {
        console.error('Paystack webhook error: Error logging transaction:', transactionError)
      }

      // Handle credit purchases
      if (paymentType === 'credits' && creditsAmount > 0) {
        const { error: creditError } = await supabaseClient.rpc('update_user_credits', {
          p_user_id: userId,
          p_amount: creditsAmount
        })

        if (creditError) {
          console.error('Paystack webhook error: Error updating credits:', creditError)
          // Do not return here, attempt to process subscription if it exists
        }
      }

      // Handle subscription purchases
      if (paymentType === 'subscription' && planId && planName) {
        const subscriptionStartDate = new Date(chargeData.paid_at)
        const expiresAt = new Date(subscriptionStartDate)
        expiresAt.setMonth(expiresAt.getMonth() + 1)

        // Deactivate any existing subscriptions for this user
        const { error: deactivateError } = await supabaseClient
          .from('user_subscriptions')
          .update({ subscription_status: 'inactive', updated_at: new Date().toISOString() })
          .eq('user_id', userId)
          .eq('subscription_status', 'active')

        if (deactivateError) {
          console.error('Paystack webhook warning: Error deactivating existing subscriptions:', deactivateError)
        }

        // Upsert subscription record
        const { error: subError } = await supabaseClient
          .from('user_subscriptions')
          .upsert({
            user_id: userId,
            subscription_type: planId,
            subscription_status: 'active',
            started_at: subscriptionStartDate.toISOString(),
            expires_at: expiresAt.toISOString(),
            paystack_subscription_code: chargeData.authorization?.authorization_code,
            paystack_customer_code: chargeData.customer?.customer_code,
              payment_provider: 'paystack',
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' })

        if (subError) {
          console.error('Paystack webhook error: Error upserting subscription:', subError)
          // Do not return, attempt to process credits/roles
        }

        // Award credits for the subscription
        if (creditsAmount > 0) {
          const { error: creditError } = await supabaseClient.rpc('update_user_credits', {
            p_user_id: userId,
            p_amount: creditsAmount
          });
          if (creditError) {
            console.error('Paystack webhook error: Error adding credits for subscription:', creditError)
          }
        }

        // Update user roles
        await supabaseClient.from('user_roles').delete().eq('user_id', userId).eq('role', 'voter')
        const { error: roleError } = await supabaseClient
          .from('user_roles')
          .upsert({ user_id: userId, role: 'subscriber' }, { onConflict: 'user_id,role' })

        if (roleError) {
          console.error('Paystack webhook warning: Error adding subscriber role:', roleError)
        }
      }
    }

    console.log('=== PAYSTACK WEBHOOK COMPLETED ===')
    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('💥 Paystack webhook uncaught error:', error)
    return new Response(`Webhook error: ${error.message}`, {
      status: 500,
      headers: corsHeaders,
    })
  }
})
