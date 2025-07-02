
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const userSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user }, error: userError } = await userSupabaseClient.auth.getUser()

    if (userError || !user) {
      console.error('Auth error:', userError?.message || 'No user found');
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data: userRoles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)

    if (rolesError) {
      console.error('Error fetching user roles:', rolesError.message);
      return new Response(JSON.stringify({ error: 'Failed to verify user permissions (roles check).' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    const url = new URL(req.url)
    const roles = userRolesData?.map((item: UserRole) => item.role) || [];
    const isSuperAdminByEmail = user.email === (Deno.env.get('SUPER_ADMIN_EMAIL') || 'ellaadahosa@gmail.com');
    const isSuperAdminByRole = roles.includes('super_admin');
    const isAdmin = roles.includes('admin');
    const isAffiliate = roles.includes('affiliate');

    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10', 10)
    const statusFilter = url.searchParams.get('status')

    const offset = (page - 1) * pageSize

    let query = supabaseAdmin
      .from('affiliate_payout_requests')
      .select(`
        *,
        profile:profiles!affiliate_user_id(full_name, email)
      `, { count: 'exact' })

    if (isSuperAdminByEmail || isSuperAdminByRole || isAdmin) {
      // Admins/SuperAdmins can see all, apply status filter if present
      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }
    } else if (isAffiliate) {
      // Affiliates can only see their own requests
      query = query.eq('affiliate_user_id', user.id);
      // Affiliates can also filter by status for their own requests
      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }
    } else {
      console.warn(`Forbidden: User ${user.id} (${user.email}) lacks required role (admin, super_admin, or affiliate) for list-affiliate-payout-requests.`);
      return new Response(JSON.stringify({ error: 'Forbidden: You do not have permission to access this resource.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403,
      });
    }

    query = query.range(offset, offset + pageSize - 1).order('requested_at', { ascending: false });

    const { data: payoutRequests, error: dbError, count } = await query

    if (dbError) {
      console.error('Database error fetching payout requests:', dbError.message)
      return new Response(JSON.stringify({ error: 'Failed to fetch payout requests', details: dbError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    const totalItems = count || 0;
    const totalPages = Math.ceil(totalItems / pageSize);

    return new Response(JSON.stringify({
      data: payoutRequests,
      pagination: {
        currentPage: page,
        pageSize,
        totalItems,
        totalPages,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Unhandled error:', error.message)
    return new Response(JSON.stringify({ error: 'An unexpected error occurred', details: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
