import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const getSupabaseAdmin = (): SupabaseClient => {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )
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
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401,
      })
    }

    const { entry_id } = await req.json()
    if (!entry_id) {
      return new Response(JSON.stringify({ error: 'entry_id is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      })
    }

    const supabaseAdmin = getSupabaseAdmin()

    // 1. Fetch the contest entry and its contest
    const { data: entry, error: entryError } = await supabaseAdmin
      .from('contest_entries')
      .select('*, contests(*)')
      .eq('id', entry_id)
      .single()

    if (entryError || !entry) {
      return new Response(JSON.stringify({ error: 'Contest entry not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404,
      })
    }

    const contest = entry.contests;
    if (!contest) {
        return new Response(JSON.stringify({ error: 'Contest not found for this entry' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404,
        });
    }

    // 2. Check if user is voting for themselves
    if (entry.user_id === user.id) {
      return new Response(JSON.stringify({ error: "You cannot vote for your own entry." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403,
      })
    }

    // Transaction to handle voting logic
    const { data, error } = await supabaseAdmin.rpc('handle_contest_vote', {
        p_entry_id: entry_id,
        p_user_id: user.id,
        p_contest_id: contest.id
    });

    if (error) {
        throw error;
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    })

  } catch (error) {
    console.error('Unhandled error in vote-for-contest-entry:', error)
    return new Response(JSON.stringify({ error: 'An unexpected error occurred.', details: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    })
  }
})
