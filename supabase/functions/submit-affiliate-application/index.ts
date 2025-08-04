
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface AffiliateApplicationPayload {
  full_name: string
  email: string
  phone: string
  social_media_url: string
  reason_to_join: string
  usdt_wallet_address: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      console.error('Error getting user:', userError)
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const userId = user.id
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Check if affiliate program is enabled
    const { data: programStatus } = await supabaseAdmin
      .from('system_settings')
      .select('value')
      .eq('key', 'affiliate_program_enabled')
      .single();

    if (programStatus && programStatus.value === false) {
      return new Response(JSON.stringify({ error: 'Affiliate program is currently paused.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 403,
      });
    }

    // Check existing applications
    const { data: existingApplications, error: existingCheckError } = await supabaseAdmin
      .from('affiliate_applications')
      .select('id, status')
      .eq('user_id', userId)
      .in('status', ['pending', 'approved'])

    if (existingCheckError) {
      console.error('Error checking existing applications:', existingCheckError)
      return new Response(JSON.stringify({ error: 'Database error while checking existing applications' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    if (existingApplications && existingApplications.length > 0) {
      const pendingOrApproved = existingApplications.find(app => app.status === 'pending' || app.status === 'approved');
      if (pendingOrApproved) {
        return new Response(JSON.stringify({ error: 'You already have an active or pending application.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 409,
        })
      }
    }

    const payload: AffiliateApplicationPayload = await req.json()
    console.log('Received payload:', payload)

    if (!payload.full_name || !payload.email || !payload.phone || !payload.social_media_url || !payload.reason_to_join || !payload.usdt_wallet_address) {
      return new Response(JSON.stringify({ error: 'Missing required fields including USDT wallet address' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const newApplication = {
      user_id: userId,
      full_name: payload.full_name,
      email: payload.email,
      phone: payload.phone,
      social_media_url: payload.social_media_url,
      reason_to_join: payload.reason_to_join,
      usdt_wallet_address: payload.usdt_wallet_address,
      status: 'pending',
    }

    console.log('Creating application with data:', newApplication)

    const { data: createdApplication, error: insertError } = await supabaseAdmin
      .from('affiliate_applications')
      .insert(newApplication)
      .select('id')
      .single()

    if (insertError) {
      console.error('Error inserting application:', insertError)
      return new Response(JSON.stringify({ error: 'Failed to create affiliate application', details: insertError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    console.log('Application created successfully:', createdApplication)
    return new Response(JSON.stringify({ message: 'Affiliate application submitted successfully.', applicationId: createdApplication.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201,
    })

  } catch (error) {
    console.error('Unhandled error:', error)
    return new Response(JSON.stringify({ error: 'An unexpected error occurred', details: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
