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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Authentication & Authorization
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

    // Fetch user roles
    const { data: userRoles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)

    if (rolesError) {
      console.error('Error fetching user roles:', rolesError.message)
      return new Response(JSON.stringify({ error: 'Failed to verify user permissions' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    const isSuperAdmin = userRoles?.some((item: UserRole) => item.role === 'super_admin')

    // Authorization Check: User must be 'super_admin'
    // Also allow our known super admin email as a fallback/override
     const knownSuperAdminEmail = Deno.env.get('SUPER_ADMIN_EMAIL') || 'ellaadahosa@gmail.com';
     if (user.email !== knownSuperAdminEmail && !isSuperAdmin) {
      console.warn(`Forbidden: User ${user.id} (${user.email}) is not super_admin. Roles: ${userRoles?.map(r => r.role).join(', ')}`);
      return new Response(JSON.stringify({ error: 'Forbidden: You do not have permission to access this resource.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }
    console.log(`User ${user.id} (${user.email}) authorized as super_admin.`);


    // 2. Logic: Fetch affiliate applications with pagination and filtering
    const url = new URL(req.url)
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10', 10)
    const statusFilter = url.searchParams.get('status')

    const offset = (page - 1) * pageSize

    let query = supabaseAdmin.from('affiliate_applications').select('*', { count: 'exact' })

    if (statusFilter) {
      query = query.eq('status', statusFilter)
    }

    query = query.range(offset, offset + pageSize - 1).order('created_at', { ascending: false });

    const { data: applications, error: dbError, count } = await query

    if (dbError) {
      console.error('Database error fetching applications:', dbError.message)
      return new Response(JSON.stringify({ error: 'Failed to fetch affiliate applications', details: dbError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    const totalItems = count || 0;
    const totalPages = Math.ceil(totalItems / pageSize);

    return new Response(JSON.stringify({
      data: applications,
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
