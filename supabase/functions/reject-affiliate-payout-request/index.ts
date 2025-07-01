
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

interface RejectPayload {
  payout_request_id: string;
  admin_notes: string;
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

    if (user.email !== knownSuperAdminEmail && !userRoles.includes('super_admin')) {
      return new Response(JSON.stringify({ error: 'Forbidden: You do not have permission to perform this action.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403,
      });
    }

    const payload: RejectPayload = await req.json();
    const { payout_request_id, admin_notes } = payload;

    if (!payout_request_id) {
      return new Response(JSON.stringify({ error: 'payout_request_id is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      });
    }

    if (!admin_notes || admin_notes.trim() === '') {
      return new Response(JSON.stringify({ error: 'admin_notes is required for rejection' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      });
    }

    const { data: payoutRequest, error: fetchError } = await supabaseAdmin
      .from('affiliate_payout_requests')
      .select('id, status')
      .eq('id', payout_request_id)
      .single();

    if (fetchError || !payoutRequest) {
      console.error('Error fetching payout request or not found:', fetchError?.message);
      return new Response(JSON.stringify({ error: 'Payout request not found.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404,
      });
    }

    if (payoutRequest.status !== 'pending') {
      return new Response(JSON.stringify({ error: `Payout request status is '${payoutRequest.status}', not 'pending'. No action taken.` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      });
    }

    const updatePayload = {
      status: 'rejected',
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      admin_notes: admin_notes,
    };

    const { data: updatedRequest, error: updateError } = await supabaseAdmin
      .from('affiliate_payout_requests')
      .update(updatePayload)
      .eq('id', payout_request_id)
      .select()
      .single();

    if (updateError || !updatedRequest) {
      console.error('Error updating payout request to rejected:', updateError?.message);
      return new Response(JSON.stringify({ error: 'Failed to reject payout request.', details: updateError?.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
      });
    }

    return new Response(JSON.stringify({
      message: 'Payout request rejected successfully.',
      payout_request: updatedRequest
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    });

  } catch (error) {
    console.error('Unhandled error in reject-affiliate-payout-request:', error);
    return new Response(JSON.stringify({ error: 'An unexpected error occurred.', details: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    });
  }
})
