
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
    // Get all environment variables to debug
    const allEnvVars = Deno.env.toObject()
    console.log('All environment variable names:', Object.keys(allEnvVars))
    
    // Try multiple possible names for the API key
    let sunoApiKey = Deno.env.get('SUNO_API_KEY')
    if (!sunoApiKey) {
      sunoApiKey = Deno.env.get('SUNO_AI_API_KEY')
    }
    if (!sunoApiKey) {
      sunoApiKey = Deno.env.get('SUNOAI_API_KEY')
    }
    
    console.log('Checking for SUNO_API_KEY...')
    console.log('SUNO_API_KEY exists:', !!sunoApiKey)
    
    if (!sunoApiKey) {
      console.error('SUNO_API_KEY not found in environment variables')
      console.error('Available secrets:', Object.keys(allEnvVars).filter(key => 
        key.includes('SUNO') || key.includes('API')
      ))
      return new Response(
        JSON.stringify({ error: 'Suno API key not configured in secrets' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Clean the API key
    sunoApiKey = sunoApiKey.trim()
    console.log('API key length after trim:', sunoApiKey.length)
    console.log('API key starts with:', sunoApiKey.substring(0, 10))

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
      console.log('Request body received:', requestBody)
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

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      console.error('Profile error:', profileError)
      return new Response(
        JSON.stringify({ error: 'Failed to get user profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userCredits = profile?.credits || 0
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

    // Test API key first with a simple request
    console.log('Testing Suno API key...')
    const testResponse = await fetch('https://api.sunoaiapi.com/api/v1/gateway/generate/music', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': sunoApiKey
      },
      body: JSON.stringify({
        prompt: "test",
        make_instrumental: true,
        wait_audio: false,
        model_version: 'chirp-v3-5'
      })
    })

    console.log('API test response status:', testResponse.status)
    
    if (testResponse.status === 401 || testResponse.status === 403) {
      console.error('Invalid API key')
      return new Response(
        JSON.stringify({ error: 'Invalid Suno API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Now make the actual request
    console.log('Making actual Suno API request...')
    const sunoRequest = {
      prompt: prompt,
      make_instrumental: instrumental || false,
      wait_audio: false,
      model_version: 'chirp-v3-5',
      title: songTitle,
      tags: style
    }

    console.log('Suno request payload:', sunoRequest)

    const sunoResponse = await fetch('https://api.sunoaiapi.com/api/v1/gateway/generate/music', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': sunoApiKey
      },
      body: JSON.stringify(sunoRequest)
    })

    console.log('Suno response status:', sunoResponse.status)
    const responseText = await sunoResponse.text()
    console.log('Suno response text:', responseText)
    
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
      console.log('Suno API response data:', sunoData)
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      return new Response(
        JSON.stringify({ error: 'Invalid API response format' }),
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
