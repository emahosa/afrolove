import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Initialize the Supabase client with the service role key
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Authenticate the user making the request
    const userSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )
    const { data: { user }, error: userError } = await userSupabaseClient.auth.getUser()

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Authorize the user as an admin
    const { data: userRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (roleError || !['admin', 'super_admin'].includes(userRole?.role)) {
        return new Response(JSON.stringify({ error: 'Forbidden: You do not have permission.' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    // 3. Validate the incoming request body
    const { winnerId, status } = await req.json()
    if (!winnerId || !status) {
      return new Response(JSON.stringify({ error: 'winnerId and status are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!['Processing', 'Fulfilled'].includes(status)) {
      return new Response(JSON.stringify({ error: 'Invalid status. Must be "Processing" or "Fulfilled".' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 4. Update the winner's claim status in the database
    const { data: updatedClaim, error: updateError } = await supabaseAdmin
      .from('winner_claims')
      .update({ status: status, updated_at: new Date().toISOString() })
      .eq('id', winnerId)
      .select()
      .single()

    if (updateError) {
      console.error('Supabase update error:', updateError)
      return new Response(JSON.stringify({ error: 'Failed to update winner claim', details: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 5. Return the successful response
    return new Response(JSON.stringify({ message: 'Status updated successfully', data: updatedClaim }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Generic error:', error)
    return new Response(JSON.stringify({ error: 'An unexpected error occurred', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
