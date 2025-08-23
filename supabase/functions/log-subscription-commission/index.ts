
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const COMMISSION_RATE = 0.10;

interface WebhookPayload {
  record: {
    user_id: string;
    amount_total: number; // Assumes amount is in cents
    // ... other webhook data
  }
}

serve(async (req) => {
  console.log('[log-subscription-commission] Received request');
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload: WebhookPayload = await req.json();
    console.log('[log-subscription-commission] Payload:', payload);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const referredUserId = payload.record.user_id;
    const subscriptionPrice = payload.record.amount_total / 100; // Convert from cents to dollars
    console.log(`[log-subscription-commission] Processing commission for user: ${referredUserId}, price: ${subscriptionPrice}`);

    // Find the referral record for this user
    const { data: referral, error: referralError } = await supabaseAdmin
      .from('affiliate_referrals')
      .select('*')
      .eq('referred_user_id', referredUserId)
      .single();

    if (referralError || !referral) {
      console.log(`[log-subscription-commission] Not a referred user or error fetching referral: ${referralError?.message}`);
      return new Response(JSON.stringify({ message: 'Not a referred user.' }), { status: 200 });
    }
    console.log('[log-subscription-commission] Found referral record:', referral);

    const affiliateId = referral.affiliate_id;
    let isFirstPayment = !referral.subscription_commission_enabled;
    let commissionEnabled = referral.subscription_commission_enabled;
    console.log(`[log-subscription-commission] isFirstPayment: ${isFirstPayment}, commissionEnabled: ${commissionEnabled}`);

    // If this is the first payment, check if it's within the 30-day window
    if (isFirstPayment) {
      console.log('[log-subscription-commission] Checking 30-day window for first payment.');
      const firstClickDate = new Date(referral.first_click_date);
      const thirtyDaysAfterClick = new Date(firstClickDate.getTime() + (30 * 24 * 60 * 60 * 1000));
      const now = new Date();
      console.log(`[log-subscription-commission] Dates - now: ${now.toISOString()}, firstClick: ${firstClickDate.toISOString()}, deadline: ${thirtyDaysAfterClick.toISOString()}`);

      if (now <= thirtyDaysAfterClick) {
        console.log('[log-subscription-commission] Payment is within 30-day window. Enabling commissions.');
        // Payment is within the window, enable commissions permanently for this referral
        const { error: updateError } = await supabaseAdmin
          .from('affiliate_referrals')
          .update({ subscription_commission_enabled: true, subscribed_within_30_days: true })
          .eq('id', referral.id);

        if (updateError) {
          console.error('[log-subscription-commission] Failed to enable commissions for referral.', updateError);
          throw new Error('Failed to enable commissions for referral.');
        }
        commissionEnabled = true;
        console.log('[log-subscription-commission] Commissions enabled successfully.');
      } else {
        console.log('[log-subscription-commission] Payment is outside 30-day window.');
      }
    }

    // If commissions are enabled for this referral, process the payment
    if (commissionEnabled) {
      const commissionAmount = subscriptionPrice * COMMISSION_RATE;
      console.log(`[log-subscription-commission] Processing commission of ${commissionAmount} for affiliate ${affiliateId}`);

      const { error: transactionError } = await supabaseAdmin.rpc('process_subscription_commission', {
        p_affiliate_id: affiliateId,
        p_is_first_payment: isFirstPayment,
        p_commission_amount: commissionAmount
      });

      if (transactionError) {
        console.error('[log-subscription-commission] Commission transaction failed.', transactionError);
        throw new Error(`Commission transaction failed: ${transactionError.message}`);
      }

      console.log('[log-subscription-commission] Commission processed successfully.');
      return new Response(JSON.stringify({ message: 'Commission processed successfully.' }), { status: 200 });
    } else {
      console.log('[log-subscription-commission] Commission not applicable for this referral.');
      return new Response(JSON.stringify({ message: 'Commission not applicable for this referral.' }), { status: 200 });
    }

  } catch (error) {
    console.error('[log-subscription-commission] Unhandled error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
