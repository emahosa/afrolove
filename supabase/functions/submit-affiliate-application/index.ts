
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
    console.log('=== Affiliate Application Submission Start ===');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      console.error('Authentication error:', userError?.message || 'No user found')
      return new Response(JSON.stringify({ error: 'Please log in to submit an application' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    console.log('User authenticated:', user.id);

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

    // Check existing applications - get the most recent one
    const { data: existingApplications, error: existingCheckError } = await supabaseAdmin
      .from('affiliate_applications')
      .select('id, status, updated_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)

    if (existingCheckError) {
      console.error('Error checking existing applications:', existingCheckError)
      return new Response(JSON.stringify({ error: 'Database error while checking applications' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    const payload: AffiliateApplicationPayload = await req.json()
    console.log('Application payload received:', payload)

    if (!payload.full_name || !payload.email || !payload.phone || !payload.reason_to_join || !payload.usdt_wallet_address) {
      return new Response(JSON.stringify({ error: 'All required fields must be filled' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Handle existing applications logic
    if (existingApplications && existingApplications.length > 0) {
      const latestApplication = existingApplications[0]
      console.log('Found existing application:', latestApplication.status, 'updated at:', latestApplication.updated_at);
      
      // If there's a pending application, reject new submission
      if (latestApplication.status === 'pending') {
        return new Response(JSON.stringify({ 
          error: 'You already have a pending application. Please wait for review.' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 409,
        })
      }
      
      // If there's an approved application, reject new submission
      if (latestApplication.status === 'approved') {
        return new Response(JSON.stringify({ 
          error: 'You already have an approved affiliate application.' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 409,
        })
      }
      
      // If the latest application is rejected, check if 60 days have passed
      if (latestApplication.status === 'rejected') {
        const rejectionDate = new Date(latestApplication.updated_at)
        const currentDate = new Date()
        const daysDifference = Math.floor((currentDate.getTime() - rejectionDate.getTime()) / (1000 * 3600 * 24))
        console.log('Days since rejection:', daysDifference);
        
        if (daysDifference < 60) {
          const remainingDays = 60 - daysDifference
          return new Response(JSON.stringify({ 
            error: `Your previous application was rejected. You can reapply in ${remainingDays} days.`
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 409,
          })
        }
        
        console.log('User can reapply - 60 days have passed since rejection');
      }
    }

    // Create new application
    const newApplication = {
      user_id: user.id,
      full_name: payload.full_name.trim(),
      email: payload.email.trim(),
      phone: payload.phone.trim(),
      social_media_url: payload.social_media_url?.trim() || null,
      reason_to_join: payload.reason_to_join.trim(),
      usdt_wallet_address: payload.usdt_wallet_address.trim(),
      status: 'pending',
    }

    console.log('Creating new application:', newApplication)

    const { data: createdApplication, error: insertError } = await supabaseAdmin
      .from('affiliate_applications')
      .insert(newApplication)
      .select('id')
      .single()

    if (insertError) {
      console.error('Error inserting application:', insertError)
      return new Response(JSON.stringify({ 
        error: 'Failed to submit application. Please try again.', 
        details: insertError.message 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    console.log('Application created successfully:', createdApplication.id)
    return new Response(JSON.stringify({ 
      message: 'Affiliate application submitted successfully!', 
      applicationId: createdApplication.id 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201,
    })

  } catch (error) {
    console.error('Unhandled error:', error)
    return new Response(JSON.stringify({ 
      error: 'An unexpected error occurred. Please try again.' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
