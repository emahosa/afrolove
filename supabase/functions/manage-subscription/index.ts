
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
      return new Response(JSON.stringify({ error: 'User not authenticated' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { action, newPlanId, newStripePriceId } = await req.json();

    if (!action) {
      return new Response(JSON.stringify({ error: 'Missing action parameter' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Processing ${action} for user ${user.id}`);

    // Retrieve the user's current active subscription
    const { data: currentSub, error: dbError } = await supabaseService
      .from('user_subscriptions')
      .select('stripe_subscription_id, payment_provider, subscription_type, expires_at')
      .eq('user_id', user.id)
      .eq('subscription_status', 'active')
      .single();

    if (dbError || !currentSub) {
      console.log('No active subscription found for user:', user.id);
      
      if (action === 'downgrade') {
        if (!newPlanId) {
          return new Response(JSON.stringify({ error: 'Missing newPlanId for downgrade' }), { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        // For users without payment provider subscription, just schedule the downgrade
        const { error: updateError } = await supabaseService
          .from('user_subscriptions')
          .update({ 
            subscription_type: newPlanId, 
            updated_at: new Date().toISOString(),
            // Set expires_at to end of current month if not set
            expires_at: currentSub?.expires_at || new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString()
          })
          .eq('user_id', user.id)
          .eq('subscription_status', 'active');

        if (updateError) {
          console.error('Failed to schedule downgrade:', updateError);
          throw new Error('Failed to schedule downgrade in DB: ' + updateError.message);
        }
        
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Downgrade scheduled for end of current billing cycle.' 
        }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      return new Response(JSON.stringify({ error: 'No active subscription found to manage.' }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // --- Paystack Flow ---
    if (currentSub.payment_provider === 'paystack') {
      return new Response(JSON.stringify({ 
        error: 'Subscription management for Paystack is not yet supported.' 
      }), { 
        status: 501, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // --- Stripe Flow ---
    if (currentSub.stripe_subscription_id) {
      const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', { apiVersion: "2023-10-16" });

      switch (action) {
        case 'downgrade':
          if (!newStripePriceId) {
            return new Response(JSON.stringify({ error: 'Missing newStripePriceId for downgrade' }), { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
          
          try {
            const subscription = await stripe.subscriptions.retrieve(currentSub.stripe_subscription_id);
            if (!subscription) {
              throw new Error('Could not find subscription in Stripe');
            }

            // Schedule the downgrade for the end of the current period
            await stripe.subscriptions.update(currentSub.stripe_subscription_id, {
              items: [{ id: subscription.items.data[0].id, price: newStripePriceId }],
              proration_behavior: 'none', // No prorating - change at period end
            });

            // Update the database to reflect the scheduled change
            await supabaseService
              .from('user_subscriptions')
              .update({ 
                subscription_type: newPlanId,
                updated_at: new Date().toISOString()
              })
              .eq('stripe_subscription_id', currentSub.stripe_subscription_id);

            console.log(`Downgrade for subscription ${currentSub.stripe_subscription_id} scheduled successfully.`);
            return new Response(JSON.stringify({ 
              success: true, 
              message: 'Downgrade scheduled for end of current billing cycle' 
            }), { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          } catch (error) {
            console.error('Stripe downgrade error:', error);
            return new Response(JSON.stringify({ 
              error: 'Failed to schedule downgrade: ' + error.message 
            }), { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

        case 'cancel':
          try {
            await stripe.subscriptions.cancel(currentSub.stripe_subscription_id);
            await supabaseService
              .from('user_subscriptions')
              .update({ subscription_status: 'inactive' })
              .eq('stripe_subscription_id', currentSub.stripe_subscription_id);
              
            console.log(`Subscription ${currentSub.stripe_subscription_id} cancelled successfully.`);
            return new Response(JSON.stringify({ 
              success: true, 
              message: 'Subscription cancelled successfully' 
            }), { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          } catch (error) {
            console.error('Stripe cancellation error:', error);
            return new Response(JSON.stringify({ 
              error: 'Failed to cancel subscription: ' + error.message 
            }), { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

        default:
          return new Response(JSON.stringify({ error: 'Invalid action' }), { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
      }
    }

    // Fallback for any other cases
    return new Response(JSON.stringify({ 
      error: 'Subscription provider not recognized or supported.' 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error managing subscription:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
})
