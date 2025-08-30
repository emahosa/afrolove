
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Authentication & Authorization
    const userSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: userError } = await userSupabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 401,
      });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const userId = user.id;

    // Check if user is admin or super admin
    const { data: userRolesData, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    if (rolesError) {
      console.error(`Error fetching roles for user ${userId}:`, rolesError.message);
      return new Response(JSON.stringify({ error: 'Failed to verify user permissions' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500,
      });
    }

    const hasAdminRole = userRolesData?.some((item: UserRole) => 
      item.role === 'admin' || item.role === 'super_admin'
    );

    // Also check if user is super admin by email
    const isSuperAdmin = user.email === 'ellaadahosa@gmail.com';

    if (!hasAdminRole && !isSuperAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 403,
      });
    }

    // Fetch payout requests with user profile data (not affiliate data)
    const { data: payoutRequests, error: fetchError } = await supabaseAdmin
      .from('affiliate_payout_requests')
      .select(`
        *,
        profiles!affiliate_payout_requests_affiliate_user_id_fkey (
          username,
          full_name
        )
      `)
      .order('requested_at', { ascending: false });

    if (fetchError) {
      console.error('Database error fetching payout requests:', fetchError.message);
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch payout requests',
        details: fetchError.message 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500,
      });
    }

    return new Response(JSON.stringify({ 
      success: true,
      data: payoutRequests || []
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
      status: 200,
    });

  } catch (error) {
    console.error('Unhandled error in list-affiliate-payout-requests:', error);
    return new Response(JSON.stringify({ 
      error: 'An unexpected error occurred.',
      details: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
      status: 500,
    });
  }
})
