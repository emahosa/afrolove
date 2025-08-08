import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from "https://esm.sh/stripe@14.21.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: { user } } = await createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    ).auth.getUser()

    if (!user) {
      return new Response(JSON.stringify({ error: 'User not authenticated' }), { status: 401, headers: corsHeaders })
    }

    const { action, newPlanId, newStripePriceId } = await req.json()

    if (!action) {
      return new Response(JSON.stringify({ error: 'Missing action parameter' }), { status: 400, headers: corsHeaders })
    }

    // Check if Stripe is enabled
    const { data: stripeSettings } = await supabaseService
      .from('system_settings')
      .select('value')
      .eq('key', 'stripe_enabled')
      .single();
    
    const isStripeEnabled = (stripeSettings?.value as { enabled?: boolean })?.enabled === true;

    // --- Non-Stripe Flow ---
    if (!isStripeEnabled) {
      if (action === 'downgrade') {
        if (!newPlanId) {
          return new Response(JSON.stringify({ error: 'Missing newPlanId for downgrade' }), { status: 400, headers: corsHeaders });
        }
        // Instantly downgrade the plan in the DB
        const { error: updateError } = await supabaseService
          .from('user_subscriptions')
          .update({ subscription_type: newPlanId, updated_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .eq('subscription_status', 'active');

        if (updateError) {
          throw new Error('Failed to downgrade subscription in DB.');
        }
        return new Response(JSON.stringify({ success: true, message: 'Downgrade successful.' }));
      }
      // Add other non-stripe actions like 'cancel' here if needed
      return new Response(JSON.stringify({ success: true, message: 'Action processed (non-Stripe).' }));
    }

    // --- Stripe Flow ---
    const { data: currentSub, error: dbError } = await supabaseService
      .from('user_subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', user.id)
      .eq('subscription_status', 'active')
      .single()

    if (dbError || !currentSub || !currentSub.stripe_subscription_id) {
      throw new Error('Could not find an active Stripe subscription for the user.')
    }

    const stripeSubscriptionId = currentSub.stripe_subscription_id

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: "2023-10-16",
    });

    switch (action) {
      case 'downgrade':
        if (!newStripePriceId) {
          return new Response(JSON.stringify({ error: 'Missing newStripePriceId for downgrade' }), { status: 400, headers: corsHeaders })
        }

        const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
        if (!subscription) {
          throw new Error('Could not find subscription in Stripe');
        }

        await stripe.subscriptions.update(stripeSubscriptionId, {
          items: [{
            id: subscription.items.data[0].id,
            price: newStripePriceId,
          }],
          proration_behavior: 'none',
        });

        console.log(`Downgrade for subscription ${stripeSubscriptionId} scheduled successfully.`);
        return new Response(JSON.stringify({ success: true, message: 'Downgrade scheduled successfully' }));

      case 'cancel':
        // This part remains the same
        await stripe.subscriptions.cancel(stripeSubscriptionId);
        await supabaseService
          .from('user_subscriptions')
          .update({ subscription_status: 'inactive' })
          .eq('stripe_subscription_id', stripeSubscriptionId);
        console.log(`Subscription ${stripeSubscriptionId} cancelled successfully.`);
        return new Response(JSON.stringify({ success: true, message: 'Subscription cancelled successfully' }));

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: corsHeaders })
    }

  } catch (error) {
    console.error('Error managing subscription:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
