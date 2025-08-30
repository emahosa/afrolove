import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
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

interface RejectPayload {
  application_id: string;
  rejection_reason?: string;
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

    // 2. Request Parameters
    const payload: RejectPayload = await req.json();
    const { application_id, rejection_reason } = payload;

    if (!application_id) {
      return new Response(JSON.stringify({ error: 'application_id is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      });
    }

    // 3. Logic
    // Fetch the application
    const { data: application, error: fetchError } = await supabaseAdmin
      .from('affiliate_applications')
      .select('id, status') // Only fetch what's needed for validation
      .eq('id', application_id)
      .single();

    if (fetchError || !application) {
      console.error('Error fetching application or not found:', fetchError?.message);
      return new Response(JSON.stringify({ error: 'Affiliate application not found.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404,
      });
    }

    if (application.status !== 'pending') {
      return new Response(JSON.stringify({ error: `Application status is '${application.status}', not 'pending'. No action taken.` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      });
    }

    // Update application status to 'rejected'
    const updatePayload: { status: string; updated_at: string; rejection_reason_notes?: string } = {
      status: 'rejected',
      updated_at: new Date().toISOString(),
    };

    // If rejection_reason was provided, log it. If a field existed, it would be set here.
    if (rejection_reason) {
      console.log(`Rejection reason for application ${application_id} by user ${user.id}: ${rejection_reason}`);
      // Example: updatePayload.rejection_reason_notes = rejection_reason; // If such a field existed
    }

    const { data: updatedApplication, error: updateAppError } = await supabaseAdmin
      .from('affiliate_applications')
      .update(updatePayload)
      .eq('id', application_id)
      .select() // Select all fields of the updated record
      .single();

    if (updateAppError || !updatedApplication) {
      console.error('Error updating application to rejected:', updateAppError?.message);
      return new Response(JSON.stringify({ error: 'Failed to reject application.', details: updateAppError?.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
      });
    }

    return new Response(JSON.stringify({
      message: 'Affiliate application rejected successfully.',
      application: updatedApplication
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    });

  } catch (error) {
    console.error('Unhandled error in reject-affiliate-application:', error);
    return new Response(JSON.stringify({ error: 'An unexpected error occurred.', details: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    });
  }
})
