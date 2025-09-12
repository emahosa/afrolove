import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Function to initialize Supabase admin client
const getSupabaseAdmin = (): SupabaseClient => {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )
}

interface UserRole {
  role: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 });
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

    const { claim_id, status, admin_notes } = await req.json();
    if (!claim_id || !status) {
      return new Response(JSON.stringify({ error: 'claim_id and status are required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      });
    }

    if (!['Processing', 'Fulfilled'].includes(status)) {
        return new Response(JSON.stringify({ error: 'Invalid status provided' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
        });
    }

    const { data: updatedClaim, error: updateError } = await supabaseAdmin
      .from('winner_claim_details')
      .update({
        status: status,
        admin_notes: admin_notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', claim_id)
      .select()
      .single();

    if (updateError || !updatedClaim) {
      console.error('Error updating winner claim:', updateError?.message);
      return new Response(JSON.stringify({ error: 'Failed to update winner claim.', details: updateError?.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
      });
    }

    return new Response(JSON.stringify({
      message: 'Winner claim updated successfully.',
      claim: updatedClaim
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    });

  } catch (error) {
    console.error('Unhandled error in update-winner-claim-status:', error);
    return new Response(JSON.stringify({ error: 'An unexpected error occurred.', details: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    });
  }
})
