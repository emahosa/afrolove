import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
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

    // Check payment gateway settings
    const { data: settingsData } = await supabaseService
      .from('system_settings')
      .select('value')
      .eq('key', 'payment_gateway_settings')
      .single();
    
    const settings = settingsData?.value as { enabled?: boolean; activeGateway?: string } | undefined;

    // --- Non-Gateway Flow ---
    if (!settings?.enabled) {
      // This flow is for when payment gateways are disabled entirely.
      // It only supports instant downgrade.
      if (action === 'downgrade') {
        if (!newPlanId) {
          return new Response(JSON.stringify({ error: 'Missing newPlanId for downgrade' }), { status: 400, headers: corsHeaders });
        }
        const { error: updateError } = await supabaseService
          .from('user_subscriptions')
          .update({ subscription_type: newPlanId, updated_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .eq('subscription_status', 'active');

        if (updateError) throw new Error('Failed to downgrade subscription in DB.');
        return new Response(JSON.stringify({ success: true, message: 'Downgrade successful.' }), { headers: corsHeaders });
      }
      return new Response(JSON.stringify({ error: 'Payment system is disabled.' }), { status: 400, headers: corsHeaders });
    }

    // --- Paystack Flow ---
    if (settings.activeGateway === 'paystack') {
      const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
      if (!paystackSecretKey) {
        throw new Error('PAYSTACK_SECRET_KEY is not set in environment variables.');
      }

      switch (action) {
        case 'downgrade': {
          if (!newPlanId) {
            return new Response(JSON.stringify({ error: 'Missing newPlanId for downgrade' }), { status: 400, headers: corsHeaders });
          }

          // 1. Get current subscription from DB
          const { data: currentSub, error: dbError } = await supabaseService
            .from('user_subscriptions')
            .select('paystack_subscription_code, paystack_customer_code')
            .eq('user_id', user.id)
            .eq('subscription_status', 'active')
            .single();

          if (dbError || !currentSub || !currentSub.paystack_subscription_code) {
            throw new Error('Could not find an active Paystack subscription for the user.');
          }

          const { paystack_subscription_code, paystack_customer_code } = currentSub;

          // 2. Get the new plan's code from the plans table
          const { data: newPlanData, error: planError } = await supabaseService
            .from('plans')
            .select('paystack_plan_code')
            .eq('id', newPlanId)
            .single();

          if (planError || !newPlanData) {
            throw new Error(`Could not find plan with ID ${newPlanId}`);
          }
          const newPaystackPlanCode = newPlanData.paystack_plan_code;

          // 3. Fetch current subscription from Paystack to get next_payment_date and email_token
          const fetchSubRes = await fetch(`https://api.paystack.co/subscription/${paystack_subscription_code}`, {
            headers: { Authorization: `Bearer ${paystackSecretKey}` },
          });

          if (!fetchSubRes.ok) {
            const errorBody = await fetchSubRes.text();
            console.error('Paystack fetch error:', errorBody);
            throw new Error('Failed to fetch subscription details from Paystack.');
          }
          const oldSubData = await fetchSubRes.json();
          const { next_payment_date, email_token } = oldSubData.data;

          // 4. Disable the old subscription on Paystack
          const disableRes = await fetch('https://api.paystack.co/subscription/disable', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${paystackSecretKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code: paystack_subscription_code, token: email_token }),
          });

          if (!disableRes.ok) {
            const errorBody = await disableRes.text();
            console.error('Paystack disable error:', errorBody);
            throw new Error('Failed to disable current subscription on Paystack.');
          }
          console.log(`Successfully disabled Paystack subscription ${paystack_subscription_code}`);

          // 5. Create a new subscription scheduled to start on the next payment date
          const createSubRes = await fetch('https://api.paystack.co/subscription', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${paystackSecretKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              customer: paystack_customer_code,
              plan: newPaystackPlanCode,
              start_date: next_payment_date,
            }),
          });

          if (!createSubRes.ok) {
             const errorBody = await createSubRes.text();
             console.error('Paystack create error:', errorBody);
            // Attempt to re-enable the old subscription as a rollback
            await fetch('https://api.paystack.co/subscription/enable', {
              method: 'POST',
              headers: { Authorization: `Bearer ${paystackSecretKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ code: paystack_subscription_code, token: email_token }),
            });
            throw new Error('Failed to create new subscription on Paystack. Old subscription has been re-enabled.');
          }
          const newSubData = await createSubRes.json();
          const newSubscriptionCode = newSubData.data.subscription_code;
          console.log(`Successfully created new Paystack subscription ${newSubscriptionCode}`);

          // 6. Update the user_subscriptions table in the database
          const { error: updateError } = await supabaseService
            .from('user_subscriptions')
            .update({
              subscription_type: newPlanId,
              paystack_subscription_code: newSubscriptionCode,
              updated_at: new Date().toISOString(),
              // The status remains 'active' as the transition is seamless
            })
            .eq('user_id', user.id);

          if (updateError) {
            // This is a critical error. The user has a new sub on Paystack but not in our DB.
            // Requires manual intervention, but we should log it clearly.
            console.error('CRITICAL: Failed to update DB after creating new Paystack subscription.', updateError);
            throw new Error('Downgrade was processed by Paystack, but failed to update our database. Please contact support.');
          }

          return new Response(JSON.stringify({ success: true, message: 'Downgrade scheduled successfully.' }), { headers: corsHeaders });
        }
        case 'cancel':
          // TODO: Implement cancellation for Paystack
          return new Response(JSON.stringify({ error: 'Cancellation for Paystack is not yet supported.' }), { status: 501, headers: corsHeaders });
        default:
          return new Response(JSON.stringify({ error: 'Invalid action for Paystack' }), { status: 400, headers: corsHeaders });
      }
    }

    // --- Stripe Flow ---
    if (settings.activeGateway === 'stripe') {
        const { data: currentSub, error: dbError } = await supabaseService
        .from('user_subscriptions')
        .select('stripe_subscription_id')
        .eq('user_id', user.id)
        .eq('subscription_status', 'active')
        .single();

        if (dbError || !currentSub || !currentSub.stripe_subscription_id) {
            throw new Error('Could not find an active Stripe subscription for the user.');
        }

        const stripeSubscriptionId = currentSub.stripe_subscription_id;
        const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', { apiVersion: "2023-10-16" });

        switch (action) {
        case 'downgrade':
            if (!newStripePriceId) {
                return new Response(JSON.stringify({ error: 'Missing newStripePriceId for downgrade' }), { status: 400, headers: corsHeaders });
            }
            const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
            if (!subscription) {
                throw new Error('Could not find subscription in Stripe');
            }
            await stripe.subscriptions.update(stripeSubscriptionId, {
                items: [{ id: subscription.items.data[0].id, price: newStripePriceId }],
                proration_behavior: 'none',
            });
            console.log(`Downgrade for subscription ${stripeSubscriptionId} scheduled successfully.`);
            return new Response(JSON.stringify({ success: true, message: 'Downgrade scheduled successfully' }), { headers: corsHeaders });

        case 'cancel':
            await stripe.subscriptions.cancel(stripeSubscriptionId);
            await supabaseService
                .from('user_subscriptions')
                .update({ subscription_status: 'inactive' })
                .eq('stripe_subscription_id', stripeSubscriptionId);
            console.log(`Subscription ${stripeSubscriptionId} cancelled successfully.`);
            return new Response(JSON.stringify({ success: true, message: 'Subscription cancelled successfully' }), { headers: corsHeaders });

        default:
            return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: corsHeaders });
        }
    }

    // Default case if no active gateway matches
    return new Response(JSON.stringify({ error: 'No active payment gateway configured or supported.' }), { status: 500, headers: corsHeaders });

  } catch (error) {
    console.error('Error managing subscription:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
})
