
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  console.log('=== SUNO GENERATE FUNCTION START ===')
  console.log('Method:', req.method)
  console.log('URL:', req.url)
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Get authorization header
    const authorization = req.headers.get('Authorization')
    if (!authorization) {
      console.error('No authorization header')
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authorization.replace('Bearer ', '')
    )

    if (authError || !user) {
      console.error('Auth error:', authError)
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User authenticated:', user.id)

    // Parse request body
    let requestBody
    try {
      requestBody = await req.json()
      console.log('Request body:', requestBody)
    } catch (error) {
      console.error('Invalid JSON:', error)
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { prompt, style, title, instrumental } = requestBody

    if (!prompt || !style) {
      console.error('Missing required fields')
      return new Response(
        JSON.stringify({ error: 'Prompt and style are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check API configuration
    console.log('Checking API configuration...')
    const { data: apiConfig, error: apiError } = await supabase
      .from('api_configs')
      .select('api_key_encrypted')
      .eq('service', 'suno')
      .eq('is_enabled', true)
      .maybeSingle()

    if (apiError) {
      console.error('API config error:', apiError)
      return new Response(
        JSON.stringify({ error: 'Database error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!apiConfig?.api_key_encrypted) {
      console.error('No Suno API key configured')
      return new Response(
        JSON.stringify({ error: 'Suno API not configured' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('API key found, checking user profile...')

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      console.error('Profile error:', profileError)
      
      // Try to create profile
      console.log('Creating new profile...')
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          full_name: user.user_metadata?.name || 'User',
          username: user.email || '',
          avatar_url: user.user_metadata?.avatar_url || '',
          credits: 5
        })
        .select('credits')
        .single()

      if (createError) {
        console.error('Profile creation error:', createError)
        return new Response(
          JSON.stringify({ error: 'Failed to create user profile' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      console.log('Profile created with credits:', newProfile.credits)
    }

    const userCredits = profile?.credits || 5
    console.log('User credits:', userCredits)

    // Check credits
    if (userCredits < 5) {
      console.error('Insufficient credits:', userCredits)
      return new Response(
        JSON.stringify({ 
          error: 'Insufficient credits. You need 5 credits to generate a song.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create song record
    const songTitle = title || `Generated ${style} Song`
    console.log('Creating song record:', songTitle)
    
    const { data: song, error: songError } = await supabase
      .from('songs')
      .insert({
        title: songTitle,
        type: instrumental ? 'instrumental' : 'song',
        user_id: user.id,
        prompt: prompt,
        status: 'pending',
        audio_url: 'pending',
        credits_used: 5
      })
      .select()
      .single()

    if (songError) {
      console.error('Song creation error:', songError)
      return new Response(
        JSON.stringify({ error: 'Failed to create song record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Song created with ID:', song.id)

    // Deduct credits
    const { error: creditError } = await supabase
      .from('profiles')
      .update({ credits: userCredits - 5 })
      .eq('id', user.id)

    if (creditError) {
      console.error('Credit deduction error:', creditError)
    }

    // Log transaction
    await supabase
      .from('credit_transactions')
      .insert({
        user_id: user.id,
        amount: -5,
        transaction_type: 'usage',
        description: 'Song generation'
      })

    // Call Suno API
    console.log('Calling Suno API...')
    const sunoRequest = {
      prompt: prompt,
      make_instrumental: instrumental || false,
      wait_audio: false,
      model_version: 'chirp-v3-5',
      title: songTitle,
      tags: style
    }

    console.log('Suno request:', sunoRequest)

    const sunoResponse = await fetch('https://api.sunoaiapi.com/api/v1/gateway/generate/music', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiConfig.api_key_encrypted
      },
      body: JSON.stringify(sunoRequest)
    })

    const responseText = await sunoResponse.text()
    console.log('Suno response status:', sunoResponse.status)
    console.log('Suno response:', responseText)

    if (!sunoResponse.ok) {
      console.error('Suno API failed:', sunoResponse.status, responseText)
      
      // Update song with error
      await supabase
        .from('songs')
        .update({ 
          status: 'rejected',
          audio_url: `error: ${responseText}`
        })
        .eq('id', song.id)
      
      return new Response(
        JSON.stringify({ 
          error: `Suno API failed: ${responseText}` 
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let sunoData
    try {
      sunoData = JSON.parse(responseText)
      console.log('Parsed Suno data:', sunoData)
    } catch (parseError) {
      console.error('Parse error:', parseError)
      
      await supabase
        .from('songs')
        .update({ 
          status: 'rejected',
          audio_url: 'error: Invalid response format'
        })
        .eq('id', song.id)
      
      return new Response(
        JSON.stringify({ error: 'Invalid API response' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle response
    if (sunoData.data && sunoData.data.length > 0) {
      const taskId = sunoData.data[0].id || sunoData.data[0].task_id
      
      if (taskId) {
        // Update song with task ID
        await supabase
          .from('songs')
          .update({ 
            audio_url: `task_pending:${taskId}`,
            status: 'pending'
          })
          .eq('id', song.id)

        console.log('Success! Task ID:', taskId)
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            song_id: song.id,
            task_id: taskId,
            message: 'Song generation started'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // If we get here, something went wrong
    console.error('No task ID in response:', sunoData)
    
    await supabase
      .from('songs')
      .update({ 
        status: 'rejected',
        audio_url: 'error: No task ID received'
      })
      .eq('id', song.id)
    
    return new Response(
      JSON.stringify({ error: 'No task ID received from Suno' }),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    console.error('Stack:', error.stack)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
