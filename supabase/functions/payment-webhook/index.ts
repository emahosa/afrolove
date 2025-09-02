import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { PaystackClient } from '../_shared/paystack.ts'

// Define interfaces for settings for type safety
interface ApiKeys {
  publicKey: string;
  secretKey: string;
}
interface GatewayConfig {
  test: ApiKeys;
  live: ApiKeys;
}
interface PaymentGatewaySettings {
  enabled: boolean;
  mode: 'test' | 'live';
  activeGateway: 'stripe' | 'paystack';
  stripe: GatewayConfig;
  paystack: GatewayConfig;
}

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

    // Load settings from the database to get the secret key
    const { data: settingsData, error: settingsError } = await supabaseClient
      .from('system_settings')
      .select('value')
      .eq('key', 'payment_gateway_settings')
      .single();

    if (settingsError) {
      console.error("Paystack webhook error: Could not load system payment settings.", settingsError);
      throw new Error('Could not load system payment settings.');
    }
    if (!settingsData?.value) {
      throw new Error('Payment settings are not configured in the system.');
    }

    let settings: PaymentGatewaySettings;
    if (typeof settingsData.value === 'string') {
      settings = JSON.parse(settingsData.value);
    } else {
      settings = settingsData.value as PaymentGatewaySettings;
    }

    const paystackKeys = settings.mode === 'live' ? settings.paystack.live : settings.paystack.test;
    const secret = paystackKeys?.secretKey || '';

    // Verify the webhook signature
    const signature = req.headers.get('x-paystack-signature')
    if (!signature) {
      console.error('Paystack webhook error: No signature found')
      return new Response('No signature', { status: 400, headers: corsHeaders })
    }

    const body = await req.text()
    if (!PaystackClient.verifyWebhookSignature(body, signature, secret)) {
        console.error('Paystack webhook error: Webhook signature verification failed.')
        return new Response('Invalid signature', { status: 401, headers: corsHeaders })
    }

    const event = JSON.parse(body)

    if (event.event === 'charge.success') {
      const chargeData = event.data;
      const reference = chargeData.reference;

      // Idempotency Check: Ensure we haven't already processed this transaction
      const { data: existingTx, error: txCheckError } = await supabaseClient
        .from('transactions')
        .select('id')
        .eq('reference', reference)
        .single();

      if (txCheckError && txCheckError.code !== 'PGRST116') {
        console.error('Paystack webhook error: Error checking for existing transaction:', txCheckError);
        throw txCheckError;
      }
      if (existingTx) {
        console.log(`Paystack webhook: Transaction reference ${reference} already processed. Skipping.`);
        return new Response(JSON.stringify({ success: true, message: 'Transaction already processed.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }

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
      await supabaseClient.from('transactions').insert({
        reference: reference,
        provider: 'paystack',
        user_id: userId,
        metadata: chargeData,
      });

      // Handle credit purchases
      if (paymentType === 'credits' && creditsAmount > 0) {
        const { error: creditError } = await supabaseClient.rpc('update_user_credits', {
          p_user_id: userId,
          p_amount: creditsAmount
        })

        if (creditError) {
          console.error('Paystack webhook error: Error updating credits:', creditError)
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
        const subscriptionData = {
          user_id: userId,
          subscription_type: planId,
          subscription_status: 'active',
          started_at: subscriptionStartDate.toISOString(),
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString()
        };

        const { error: subError } = await supabaseClient
          .from('user_subscriptions')
          .upsert(subscriptionData, { onConflict: 'user_id' })

        if (subError) {
          console.error('Paystack webhook error: Error upserting subscription:', subError)
        }

        // Award credits for the subscription (ONCE)
        if (creditsAmount > 0) {
          console.log(`💰 Awarding ${creditsAmount} credits for subscription to user ${userId}`);
          const { error: creditError } = await supabaseClient.rpc('update_user_credits', {
            p_user_id: userId,
            p_amount: creditsAmount
          });

          if (creditError) {
            console.error('❌ Error adding credits for subscription:', creditError);
          } else {
            console.log('✅ Credits awarded successfully for subscription');
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