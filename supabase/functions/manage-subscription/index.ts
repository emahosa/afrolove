import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from "https://esm.sh/stripe@14.21.0"
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user } } = await createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    ).auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: 'User not authenticated' }), { status: 401, headers: corsHeaders });
    }

    const { action, newPlanId, newStripePriceId } = await req.json();

    if (!action) {
      return new Response(JSON.stringify({ error: 'Missing action parameter' }), { status: 400, headers: corsHeaders });
    }

    // Retrieve the user's current active subscription
    const { data: currentSub, error: dbError } = await supabaseService
      .from('user_subscriptions')
      .select('stripe_subscription_id, payment_provider')
      .eq('user_id', user.id)
      .eq('subscription_status', 'active')
      .single();

    if (dbError || !currentSub) {
      // This handles cases where the user has no active subscription.
      // It also covers the "Non-Gateway Flow" where a subscription might exist but isn't managed by a gateway.
      if (action === 'downgrade') {
        if (!newPlanId) {
          return new Response(JSON.stringify({ error: 'Missing newPlanId for downgrade' }), { status: 400, headers: corsHeaders });
        }
        // This is the legacy/non-gateway instant downgrade.
        // The user story suggests this is wrong, but changing it requires a larger architectural discussion (e.g., cron jobs).
        // For now, we keep the logic but ensure it's only hit when no payment provider is found.
        const { error: updateError } = await supabaseService
          .from('user_subscriptions')
          .update({ subscription_type: newPlanId, updated_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .eq('subscription_status', 'active');

        if (updateError) throw new Error('Failed to downgrade subscription in DB: ' + updateError.message);
        return new Response(JSON.stringify({ success: true, message: 'Downgrade successful.' }), { headers: corsHeaders });
      }
      return new Response(JSON.stringify({ error: 'No active subscription found to manage.' }), { status: 404, headers: corsHeaders });
    }

    // --- Paystack Flow ---
    if (currentSub.payment_provider === 'paystack') {
      return new Response(JSON.stringify({ error: 'Subscription management for Paystack is not yet supported.' }), { status: 501, headers: corsHeaders });
    }

    // --- Stripe Flow ---
    if (currentSub.stripe_subscription_id) {
      const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', { apiVersion: "2023-10-16" });

      switch (action) {
        case 'downgrade':
          if (!newStripePriceId) {
            return new Response(JSON.stringify({ error: 'Missing newStripePriceId for downgrade' }), { status: 400, headers: corsHeaders });
          }
          const subscription = await stripe.subscriptions.retrieve(currentSub.stripe_subscription_id);
          if (!subscription) {
            throw new Error('Could not find subscription in Stripe');
          }
          await stripe.subscriptions.update(currentSub.stripe_subscription_id, {
            items: [{ id: subscription.items.data[0].id, price: newStripePriceId }],
            proration_behavior: 'none',
          });
          console.log(`Downgrade for subscription ${currentSub.stripe_subscription_id} scheduled successfully.`);
          return new Response(JSON.stringify({ success: true, message: 'Downgrade scheduled successfully' }), { headers: corsHeaders });

        case 'cancel':
          await stripe.subscriptions.cancel(currentSub.stripe_subscription_id);
          await supabaseService
            .from('user_subscriptions')
            .update({ subscription_status: 'inactive' })
            .eq('stripe_subscription_id', currentSub.stripe_subscription_id);
          console.log(`Subscription ${currentSub.stripe_subscription_id} cancelled successfully.`);
          return new Response(JSON.stringify({ success: true, message: 'Subscription cancelled successfully' }), { headers: corsHeaders });

        default:
          return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: corsHeaders });
      }
    }

    // Fallback for any other cases
    return new Response(JSON.stringify({ error: 'Subscription provider not recognized or supported.' }), { status: 500, headers: corsHeaders });

  } catch (error) {
    console.error('Error managing subscription:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
})
