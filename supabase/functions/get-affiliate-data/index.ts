import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// NOTE: This implementation contains inefficient balance calculations.
// These should be optimized later by adding dedicated balance columns
// to the affiliate table, as outlined in the engineering plan.

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { type, userId } = await req.json();
    if (!userId) {
      throw new Error('userId is required');
    }

    let data = {};

    switch (type) {
      case 'links':
        const { data: appForLink, error: appForLinkError } = await supabaseAdmin
          .from('affiliate_applications')
          .select('unique_referral_code')
          .eq('user_id', userId)
          .eq('status', 'approved')
          .single();

        if (appForLinkError) {
          console.error('Error fetching affiliate application for link:', appForLinkError);
          data = { links: [] };
        } else {
          const referralCode = appForLink?.unique_referral_code;
          const links = referralCode ? [{
            id: '1', // Static ID as there's only one link per affiliate
            url: `https://afroverse.com/?ref=${referralCode}`,
            referral_code: referralCode,
            clicks_count: 0, // Note: click tracking to be implemented
            created_at: new Date().toISOString(),
          }] : [];
          data = { links };
        }
        break;

      case 'wallet':
        // Fetch wallet address from applications table
        const { data: appForWallet, error: appForWalletError } = await supabaseAdmin
          .from('affiliate_applications')
          .select('usdt_wallet_address')
          .eq('user_id', userId)
          .single();

        if (appForWalletError) throw new Error('Could not fetch affiliate wallet details.');

        // Calculate pending balance from commissions
        const { data: commissions, error: commissionsError } = await supabaseAdmin
          .from('affiliate_commissions')
          .select('amount_earned')
          .eq('affiliate_user_id', userId);

        if (commissionsError) throw new Error('Could not calculate pending balance.');
        const pending_balance = commissions?.reduce((sum, item) => sum + (item.amount_earned || 0), 0) || 0;

        // Calculate paid balance from payout requests
        const { data: payouts, error: payoutsError } = await supabaseAdmin
          .from('affiliate_payout_requests')
          .select('requested_amount')
          .eq('affiliate_user_id', userId)
          .eq('status', 'paid');

        if (payoutsError) throw new Error('Could not calculate paid balance.');
        const paid_balance = payouts?.reduce((sum, item) => sum + (item.requested_amount || 0), 0) || 0;

        const lifetime_earnings = pending_balance + paid_balance;

        data = {
          wallet: {
            id: userId,
            affiliate_user_id: userId,
            usdt_wallet_address: appForWallet?.usdt_wallet_address || null,
            pending_balance: pending_balance,
            paid_balance: paid_balance,
            lifetime_earnings: lifetime_earnings,
          }
        };
        break;

      case 'earnings':
        const { data: earnings, error: earningsError } = await supabaseAdmin
          .from('affiliate_commissions') // Corrected table name
          .select(`
            id,
            referred_user_id,
            amount_earned,
            created_at,
            profile:referred_user_id (
              full_name
            )
          `)
          .eq('affiliate_user_id', userId)
          .order('created_at', { ascending: false })
          .limit(50);

        if (earningsError) {
          console.error('Error fetching earnings:', earningsError);
          data = { earnings: [] };
        } else {
          // The frontend expects a 'type' and 'status' field, let's add them
          const formattedEarnings = earnings.map(e => ({
            ...e,
            type: 'subscription', // Assuming all commissions are from subscriptions for now
            status: 'cleared' // Placeholder status
          }));
          data = { earnings: formattedEarnings || [] };
        }
        break;

      default:
        throw new Error('Invalid data type requested');
    }

    return new Response(
      JSON.stringify(data),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in get-affiliate-data:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
