
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Check if user is admin
    const { data: userRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)

    const isAdmin = userRoles?.some(role => ['admin', 'super_admin'].includes(role.role)) || 
                   user.email === 'ellaadahosa@gmail.com'

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    console.log('Admin access verified, fetching applications...')

    // Fetch all affiliate applications with enhanced logging
    const { data: applications, error: applicationsError } = await supabaseAdmin
      .from('affiliate_applications')
      .select('*')
      .order('created_at', { ascending: false })

    if (applicationsError) {
      console.error('Error fetching applications:', applicationsError)
      return new Response(JSON.stringify({ error: 'Failed to fetch applications', details: applicationsError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    console.log(`Successfully fetched ${applications?.length || 0} applications`)
    
    // Log the applications data for debugging
    applications?.forEach((app, index) => {
      console.log(`Application ${index + 1}:`, {
        id: app.id,
        email: app.email,
        status: app.status,
        created_at: app.created_at
      })
    })

    return new Response(JSON.stringify(applications || []), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Error in admin-list-affiliate-applications:', error)
    return new Response(JSON.stringify({ error: 'Internal server error', details: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
