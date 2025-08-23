
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    // Verify user authentication
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'Authorization': authHeader,
        'apikey': Deno.env.get('SUPABASE_ANON_KEY')!
      }
    })

    if (!userResponse.ok) {
      return new Response(JSON.stringify({ error: 'Authentication failed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const user = await userResponse.json()
    console.log('Authenticated user:', user.id)

    // Check if user is admin
    const rolesResponse = await fetch(`${supabaseUrl}/rest/v1/user_roles?user_id=eq.${user.id}`, {
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey,
        'Content-Type': 'application/json'
      }
    })

    const userRoles = await rolesResponse.json()
    const isAdmin = userRoles?.some((role: any) => ['admin', 'super_admin'].includes(role.role)) || 
                   user.email === 'ellaadahosa@gmail.com'

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    console.log('Admin access verified, fetching applications...')

    // Fetch all affiliate applications
    const applicationsResponse = await fetch(`${supabaseUrl}/rest/v1/affiliate_applications?select=*&order=created_at.desc`, {
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey,
        'Content-Type': 'application/json'
      }
    })

    if (!applicationsResponse.ok) {
      const errorText = await applicationsResponse.text()
      console.error('Error fetching applications:', errorText)
      return new Response(JSON.stringify({ error: 'Failed to fetch applications', details: errorText }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    const applications = await applicationsResponse.json()
    console.log(`Successfully fetched ${applications?.length || 0} applications`)
    
    applications?.forEach((app: any, index: number) => {
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
