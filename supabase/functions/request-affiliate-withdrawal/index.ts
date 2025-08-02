
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const getSupabaseAdmin = (): SupabaseClient => {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
}

interface UserRole {
  role: string;
}

interface WithdrawalRequestPayload {
  requested_amount: number;
  usdt_wallet_address: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const userSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: userError } = await userSupabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401,
      });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const affiliateUserId = user.id;

    // Verify 'affiliate' role
    const { data: userRolesData, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', affiliateUserId);

    if (rolesError) {
      console.error(`Error fetching roles for user ${affiliateUserId}:`, rolesError.message);
      return new Response(JSON.stringify({ error: 'Failed to verify user permissions' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
      });
    }

    const isAffiliate = userRolesData?.some((item: UserRole) => item.role === 'affiliate');
    if (!isAffiliate) {
      return new Response(JSON.stringify({ error: 'Forbidden: User is not an affiliate.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403,
      });
    }

    const payload: WithdrawalRequestPayload = await req.json();
    const { requested_amount, usdt_wallet_address } = payload;

    if (typeof requested_amount !== 'number' || requested_amount <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid requested_amount. Must be a positive number.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      });
    }

    if (!usdt_wallet_address || !usdt_wallet_address.trim()) {
      return new Response(JSON.stringify({ error: 'USDT wallet address is required.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      });
    }

    // Get settings
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('system_settings')
      .select('key, value')
      .in('key', ['affiliate_minimum_withdrawal', 'affiliate_withdrawal_fee_percent']);

    if (settingsError) {
      console.error('Error fetching settings:', settingsError.message);
      return new Response(JSON.stringify({ error: 'Failed to fetch system settings' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
      });
    }

    const settingsMap = new Map(settings?.map(s => [s.key, parseFloat(s.value)]) || []);
    const minimumWithdrawal = settingsMap.get('affiliate_minimum_withdrawal') || 50;
    const withdrawalFeePercent = settingsMap.get('affiliate_withdrawal_fee_percent') || 10;

    if (requested_amount < minimumWithdrawal) {
      return new Response(JSON.stringify({
        error: `Requested amount is below the minimum withdrawal threshold of $${minimumWithdrawal.toFixed(2)}.`,
        minimum_withdrawal: minimumWithdrawal
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      });
    }

    // Get affiliate wallet
    const { data: wallet, error: walletError } = await supabaseAdmin
      .from('affiliate_wallets')
      .select('balance')
      .eq('affiliate_user_id', affiliateUserId)
      .single();

    if (walletError) {
      console.error(`Error fetching wallet for user ${affiliateUserId}:`, walletError.message);
      return new Response(JSON.stringify({ error: 'Failed to fetch wallet balance.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
      });
    }

    const currentBalance = parseFloat(wallet.balance) || 0;

    if (requested_amount > currentBalance) {
      return new Response(JSON.stringify({
        error: 'Requested amount exceeds available balance.',
        current_balance: currentBalance.toFixed(2),
        requested_amount: requested_amount.toFixed(2)
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      });
    }

    // Calculate withdrawal fee and net amount
    const withdrawalFee = (requested_amount * withdrawalFeePercent) / 100;
    const netAmount = requested_amount - withdrawalFee;

    // Create withdrawal request
    const newWithdrawalRequest = {
      affiliate_user_id: affiliateUserId,
      requested_amount: requested_amount.toFixed(2),
      usdt_wallet_address: usdt_wallet_address.trim(),
      withdrawal_fee: withdrawalFee.toFixed(2),
      net_amount: netAmount.toFixed(2),
      status: 'pending',
      requested_at: new Date().toISOString(),
    };

    const { data: createdRequest, error: insertError } = await supabaseAdmin
      .from('affiliate_payout_requests')
      .insert(newWithdrawalRequest)
      .select()
      .single();

    if (insertError) {
      console.error(`Error inserting withdrawal request for user ${affiliateUserId}:`, insertError.message);
      return new Response(JSON.stringify({ error: 'Failed to create withdrawal request.', details: insertError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
      });
    }

    // Update affiliate wallet address
    await supabaseAdmin
      .from('affiliate_wallets')
      .update({ 
        usdt_wallet_address: usdt_wallet_address.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('affiliate_user_id', affiliateUserId);

    return new Response(JSON.stringify({
      message: 'Withdrawal request submitted successfully.',
      withdrawal_request: createdRequest,
      withdrawal_fee: withdrawalFee.toFixed(2),
      net_amount: netAmount.toFixed(2)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 201,
    });

  } catch (error) {
    console.error('Unhandled error in request-affiliate-withdrawal:', error);
    return new Response(JSON.stringify({ error: 'An unexpected error occurred.', details: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    });
  }
})
