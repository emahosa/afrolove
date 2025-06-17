import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Function to initialize Supabase admin client
const getSupabaseAdmin = (): SupabaseClient => {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
}

interface UserRole {
  role: string;
}

interface PayoutRequestPayload {
  requested_amount: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Authentication & Authorization
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

    // 2. Request Parameters
    const payload: PayoutRequestPayload = await req.json();
    const { requested_amount } = payload;

    if (typeof requested_amount !== 'number' || requested_amount <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid requested_amount. Must be a positive number.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      });
    }

    // 3. Logic
    // Calculate total earned commissions
    const { data: commissions, error: commissionError } = await supabaseAdmin
      .from('affiliate_commissions')
      .select('amount_earned')
      .eq('affiliate_user_id', affiliateUserId);

    if (commissionError) {
      console.error(`Error fetching commissions for user ${affiliateUserId}:`, commissionError.message);
      return new Response(JSON.stringify({ error: 'Failed to calculate total earnings.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
      });
    }
    const totalEarned = commissions?.reduce((sum, record) => sum + Number(record.amount_earned), 0) || 0;

    // Calculate total pending or approved (but not paid/rejected) payouts
    const { data: existingPayouts, error: payoutError } = await supabaseAdmin
      .from('affiliate_payout_requests')
      .select('requested_amount')
      .eq('affiliate_user_id', affiliateUserId)
      .in('status', ['pending', 'approved']);

    if (payoutError) {
      console.error(`Error fetching existing payouts for user ${affiliateUserId}:`, payoutError.message);
      return new Response(JSON.stringify({ error: 'Failed to calculate existing payouts.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
      });
    }
    const totalPendingOrApprovedPayouts = existingPayouts?.reduce((sum, record) => sum + Number(record.requested_amount), 0) || 0;

    const currentBalance = totalEarned - totalPendingOrApprovedPayouts;

    // Validate request
    if (requested_amount > currentBalance) {
      return new Response(JSON.stringify({
        error: 'Requested amount exceeds available balance.',
        current_balance: currentBalance.toFixed(2),
        requested_amount: requested_amount.toFixed(2)
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      });
    }

    // Minimum payout threshold (example: $10, can be an env var)
    const minimumPayout = parseFloat(Deno.env.get('MINIMUM_PAYOUT_THRESHOLD') || "10");
    if (requested_amount < minimumPayout) {
        return new Response(JSON.stringify({
            error: `Requested amount is below the minimum payout threshold of $${minimumPayout.toFixed(2)}.`,
            requested_amount: requested_amount.toFixed(2)
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
        });
    }


    // Insert Payout Request
    const newPayoutRequest = {
      affiliate_user_id: affiliateUserId,
      requested_amount: requested_amount.toFixed(2),
      status: 'pending',
      requested_at: new Date().toISOString(),
      // created_at and updated_at will be set by default by db
    };

    const { data: createdRequest, error: insertError } = await supabaseAdmin
      .from('affiliate_payout_requests')
      .insert(newPayoutRequest)
      .select()
      .single();

    if (insertError) {
      console.error(`Error inserting payout request for user ${affiliateUserId}:`, insertError.message);
      return new Response(JSON.stringify({ error: 'Failed to create payout request.', details: insertError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
      });
    }

    return new Response(JSON.stringify({
      message: 'Payout request submitted successfully.',
      payout_request: createdRequest
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 201, // Created
    });

  } catch (error) {
    console.error('Unhandled error in request-affiliate-payout:', error);
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
