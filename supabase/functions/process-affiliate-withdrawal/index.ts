
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

interface WithdrawalPayload {
  payout_request_id: string;
  admin_notes?: string;
  action: 'approve' | 'reject' | 'mark_paid';
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
    const { data: userRolesData, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (rolesError) {
      console.error('Error fetching user roles:', rolesError.message);
      return new Response(JSON.stringify({ error: 'Failed to verify user permissions' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
      });
    }

    const userRoles = userRolesData?.map((item: UserRole) => item.role) || [];
    const knownSuperAdminEmail = Deno.env.get('SUPER_ADMIN_EMAIL') || 'ellaadahosa@gmail.com';

    if (user.email !== knownSuperAdminEmail && !userRoles.includes('super_admin') && !userRoles.includes('admin')) {
      return new Response(JSON.stringify({ error: 'Forbidden: You do not have permission to perform this action.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403,
      });
    }

    const payload: WithdrawalPayload = await req.json();
    const { payout_request_id, admin_notes, action } = payload;

    if (!payout_request_id || !action) {
      return new Response(JSON.stringify({ error: 'payout_request_id and action are required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      });
    }

    const { data: payoutRequest, error: fetchError } = await supabaseAdmin
      .from('affiliate_payout_requests')
      .select('*')
      .eq('id', payout_request_id)
      .single();

    if (fetchError || !payoutRequest) {
      console.error('Error fetching payout request or not found:', fetchError?.message);
      return new Response(JSON.stringify({ error: 'Payout request not found.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404,
      });
    }

    let updatePayload: any = {
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (admin_notes) {
      updatePayload.admin_notes = admin_notes;
    }

    if (action === 'approve') {
      if (payoutRequest.status !== 'pending') {
        return new Response(JSON.stringify({ error: `Payout request status is '${payoutRequest.status}', not 'pending'.` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
        });
      }
      updatePayload.status = 'approved';
    } else if (action === 'reject') {
      if (payoutRequest.status !== 'pending') {
        return new Response(JSON.stringify({ error: `Payout request status is '${payoutRequest.status}', not 'pending'.` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
        });
      }
      updatePayload.status = 'rejected';
    } else if (action === 'mark_paid') {
      if (payoutRequest.status !== 'approved') {
        return new Response(JSON.stringify({ error: `Payout request status is '${payoutRequest.status}', not 'approved'.` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
        });
      }
      updatePayload.status = 'paid';

      // Update affiliate wallet balance
      await supabaseAdmin
        .from('affiliate_wallets')
        .update({
          balance: supabaseAdmin.sql`balance - ${payoutRequest.requested_amount}`,
          total_withdrawn: supabaseAdmin.sql`total_withdrawn + ${payoutRequest.net_amount || payoutRequest.requested_amount}`,
          updated_at: new Date().toISOString()
        })
        .eq('affiliate_user_id', payoutRequest.affiliate_user_id);
    }

    const { data: updatedRequest, error: updateError } = await supabaseAdmin
      .from('affiliate_payout_requests')
      .update(updatePayload)
      .eq('id', payout_request_id)
      .select()
      .single();

    if (updateError || !updatedRequest) {
      console.error('Error updating payout request:', updateError?.message);
      return new Response(JSON.stringify({ error: 'Failed to update payout request.', details: updateError?.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
      });
    }

    return new Response(JSON.stringify({
      message: `Payout request ${action}d successfully.`,
      payout_request: updatedRequest
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    });

  } catch (error) {
    console.error('Unhandled error in process-affiliate-withdrawal:', error);
    return new Response(JSON.stringify({ error: 'An unexpected error occurred.', details: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    });
  }
})
