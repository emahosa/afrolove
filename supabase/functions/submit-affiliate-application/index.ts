import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts' // Assuming shared CORS headers
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Define the expected request body structure
interface AffiliateApplicationPayload {
  full_name: string
  email: string
  phone: string
  social_media_url: string
  reason_to_join: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the user's authorization
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      console.error('Error getting user:', userError)
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const userId = user.id

    // Use a Supabase admin client for database operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Check if the user is a subscriber
    const { data: userRoles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    const { data: subscription, error: subError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('subscription_status, expires_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (rolesError) {
      console.error('Error checking user roles for subscriber status:', rolesError);
      return new Response(JSON.stringify({ error: 'Failed to verify subscriber status (roles check).' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
      });
    }
    // PGRST116 is the PostgREST code for "Not Found" which is acceptable if user has 'subscriber' role
    if (subError && subError.code !== 'PGRST116') {
      console.error('Error checking subscription details for subscriber status:', subError);
      return new Response(JSON.stringify({ error: 'Failed to verify subscriber status (subscription check).' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
      });
    }

    const isRoleSubscriber = userRoles?.some(r => (r as { role: string }).role === 'subscriber');
    const isActiveSubscription = subscription?.subscription_status === 'active' && (!subscription.expires_at || new Date(subscription.expires_at) > new Date());

    if (!isRoleSubscriber && !isActiveSubscription) {
      return new Response(JSON.stringify({ error: 'Only subscribers can apply to be an affiliate.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403, // Forbidden
      });
    }

    // Parse the request body
    const payload: AffiliateApplicationPayload = await req.json()

    // Validate payload
    if (!payload.full_name || !payload.email || !payload.phone || !payload.social_media_url || !payload.reason_to_join) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Use a Supabase admin client for database operations to bypass RLS if necessary,
    // or ensure your RLS policies allow this operation for authenticated users.
    // For simplicity, using the service role key here for direct DB access.
    // Ensure SUPABASE_SERVICE_ROLE_KEY is set in your Edge Function environment variables.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Check if the user already has a pending or approved application
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
      return new Response(JSON.stringify({ error: 'You already have an active or pending application.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 409, // Conflict
      })
    }

    // Insert the new application
    const newApplication = {
      user_id: userId,
      full_name: payload.full_name,
      email: payload.email,
      phone: payload.phone,
      social_media_url: payload.social_media_url,
      reason_to_join: payload.reason_to_join,
      status: 'pending', // Default status
    }

    const { data: createdApplication, error: insertError } = await supabaseAdmin
      .from('affiliate_applications')
      .insert(newApplication)
      .select('id')
      .single() // Expecting a single record to be created and returned

    if (insertError) {
      console.error('Error inserting application:', insertError)
      return new Response(JSON.stringify({ error: 'Failed to create affiliate application', details: insertError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    return new Response(JSON.stringify({ message: 'Affiliate application submitted successfully.', applicationId: createdApplication.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201, // Created
    })

  } catch (error) {
    console.error('Unhandled error:', error)
    return new Response(JSON.stringify({ error: 'An unexpected error occurred', details: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
