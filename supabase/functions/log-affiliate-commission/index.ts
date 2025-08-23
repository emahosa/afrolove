import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts' // Good practice, though less critical for webhooks
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Function to initialize Supabase admin client
const getSupabaseAdmin = (): SupabaseClient => {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
}

interface WebhookPayload {
  user_id: string; // User who made the payment
  payment_amount: number;
  currency: string;
  subscription_payment_id: string; // Unique payment ID from gateway
  event_type: string; // e.g., 'invoice.paid', 'customer.subscription.created'
  // Potentially other fields from the webhook provider
}

// Define acceptable event types that trigger commission logging
const ACCEPTABLE_EVENT_TYPES = [
  'invoice.paid', // Stripe: successful payment for a subscription invoice
  'customer.subscription.created', // Stripe: if it implies an immediate successful payment
  // Add other relevant types from your specific payment provider
  // e.g., 'checkout.session.completed' if it's specifically for a subscription
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Security: Verify Webhook Secret
    const webhookSecret = Deno.env.get('WEBHOOK_SECRET');
    const requestSecret = req.headers.get('X-Webhook-Secret'); // Example header

    if (!webhookSecret) {
        console.warn("WEBHOOK_SECRET is not set in environment variables. Skipping verification (NOT SECURE).");
    } else if (webhookSecret !== requestSecret) {
      console.error('Webhook secret verification failed.');
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid webhook secret' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403, // Or 401
      });
    }

    // 2. Request Parameters
    const payload: WebhookPayload = await req.json();

    if (!payload.user_id || !payload.payment_amount || !payload.subscription_payment_id || !payload.event_type) {
      return new Response(JSON.stringify({ error: 'Missing required fields in webhook payload' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      });
    }

    if (payload.payment_amount <= 0) {
        return new Response(JSON.stringify({ error: 'Payment amount must be positive.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
        });
    }

    // 3. Logic
    // Verify Event Type
    if (!ACCEPTABLE_EVENT_TYPES.includes(payload.event_type)) {
      console.log(`Event type '${payload.event_type}' is not relevant for commission. No action taken.`);
      return new Response(JSON.stringify({ message: 'Event type not relevant for commission.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200, // Or 204 No Content
      });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Fetch Referrer ID from profiles table
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('referrer_id')
      .eq('id', payload.user_id)
      .single();

    if (profileError) {
      console.error(`Error fetching profile for user_id ${payload.user_id}:`, profileError.message);
      return new Response(JSON.stringify({ error: 'Database error fetching user profile.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
      });
    }

    if (!profile || !profile.referrer_id) {
      console.log(`User ${payload.user_id} has no referrer or profile not found. No commission logged.`);
      return new Response(JSON.stringify({ message: 'No referrer found for user. No commission logged.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200, // Or 204
      });
    }

    const referrerUserId = profile.referrer_id;

    // Calculate Commission (15%)
    const commissionEarned = payload.payment_amount * 0.15;

    // Insert into affiliate_commissions table
    const commissionData = {
      affiliate_user_id: referrerUserId,
      referred_user_id: payload.user_id,
      subscription_payment_id: payload.subscription_payment_id,
      amount_earned: commissionEarned.toFixed(2), // Ensure 2 decimal places
      commission_month: new Date().toISOString().substring(0, 7) + '-01', // YYYY-MM-01
    };

    const { error: commissionError } = await supabaseAdmin
      .from('affiliate_commissions')
      .insert(commissionData);

    if (commissionError) {
      console.error('Error inserting affiliate commission:', commissionError.message);
      // Check for unique constraint violation on subscription_payment_id to prevent double logging
      if (commissionError.code === '23505') { // Unique violation
        return new Response(JSON.stringify({ error: 'Commission already logged for this payment ID.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409, // Conflict
        });
      }
      return new Response(JSON.stringify({ error: 'Failed to log affiliate commission.', details: commissionError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
      });
    }

    console.log(`Commission of ${commissionEarned.toFixed(2)} ${payload.currency} logged for affiliate ${referrerUserId} from user ${payload.user_id}'s payment ${payload.subscription_payment_id}.`);
    return new Response(JSON.stringify({ message: 'Affiliate commission logged successfully.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    });

  } catch (error) {
    console.error('Unhandled error in log-affiliate-commission webhook:', error);
    if (error instanceof SyntaxError) { // JSON parsing error
        return new Response(JSON.stringify({ error: 'Invalid JSON payload.' , details: error.message}), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
        });
    }
    return new Response(JSON.stringify({ error: 'An unexpected error occurred.', details: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    });
  }
})
