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
      return new Response(JSON.stringify({ error: 'Forbidden: You do not have permission to access this resource.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403,
      });
    }

    // 2. Logic: Fetch payout requests
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10', 10);
    const statusFilter = url.searchParams.get('status');
    const sortBy = url.searchParams.get('sortBy') || 'requested_at';
    const sortOrderAsc = (url.searchParams.get('sortOrder') || 'desc').toLowerCase() === 'asc';

    const offset = (page - 1) * pageSize;

    // Attempt to join with profiles table.
    // The foreign key from affiliate_payout_requests.affiliate_user_id to profiles.id must exist.
    // The select string '*, profiles(full_name, email)' tells Supabase to fetch all columns
    // from affiliate_payout_requests and the specified columns from the related profiles record.
    // If 'profiles' is not the correct table name referenced by 'affiliate_user_id', this will need adjustment.
    // Or if the FK relationship is named differently, it might be e.g. affiliate_user_id!inner(full_name, email)

    let query = supabaseAdmin
      .from('affiliate_payout_requests')
      .select(`
        *,
        profile:profiles (
          full_name,
          email
        )
      `, { count: 'exact' });
      // Note: Changed 'profiles' to 'profile:profiles' to avoid conflict if 'profiles' is a column name
      // and to give it a clear alias in the returned JSON.
      // This assumes affiliate_payout_requests.affiliate_user_id is a FK to profiles.id


    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    // Validate sortBy to prevent arbitrary column sorting if necessary, or ensure it's a valid column.
    // For now, assuming sortBy is a valid column name in 'affiliate_payout_requests'.
    query = query.order(sortBy, { ascending: sortOrderAsc });
    query = query.range(offset, offset + pageSize - 1);

    const { data: payoutRequests, error: dbError, count } = await query;

    if (dbError) {
      console.error('Database error fetching payout requests:', dbError.message);
      return new Response(JSON.stringify({ error: 'Failed to fetch payout requests', details: dbError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
      });
    }

    // Post-process to move profile data to a cleaner structure if default join syntax is nested weirdly
    // Supabase typically nests it like: { ..., profiles: { full_name, email } }
    // which is fine. If the alias `profile:profiles` worked, it will be `profile: { full_name, email }`

    const totalItems = count || 0;
    const totalPages = Math.ceil(totalItems / pageSize);

    return new Response(JSON.stringify({
      data: payoutRequests,
      pagination: {
        currentPage: page,
        pageSize,
        totalItems,
        totalPages,
        sortBy,
        sortOrder: sortOrderAsc ? 'asc' : 'desc',
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    });

  } catch (error) {
    console.error('Unhandled error:', error.message);
    return new Response(JSON.stringify({ error: 'An unexpected error occurred', details: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    });
  }
})
