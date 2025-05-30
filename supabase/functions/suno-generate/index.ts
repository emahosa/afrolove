
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
    // Get the API key and aggressively clean it
    let sunoApiKey = Deno.env.get('SUNO_API_KEY')
    
    if (sunoApiKey) {
      // Remove all whitespace, newlines, carriage returns
      sunoApiKey = sunoApiKey.replace(/[\r\n\t\s]/g, '')
      console.log('Cleaned API key length:', sunoApiKey.length)
      console.log('API key starts with:', sunoApiKey.substring(0, 10))
    }
    
    if (!sunoApiKey || sunoApiKey.length < 10) {
      console.error('SUNO_API_KEY not found or invalid')
      return new Response(
        JSON.stringify({ error: 'Suno API key not configured properly' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase with service role key to bypass RLS issues
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

    // Verify user using the service role client to bypass RLS
    const token = authorization.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

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

    const { prompt, style, title, instrumental, customMode, model, negativeTags } = requestBody

    // Validate required fields
    if (!prompt) {
      console.error('Missing prompt field')
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate model
    const validModels = ['V3_5', 'V4', 'V4_5']
    const selectedModel = model || 'V3_5'
    if (!validModels.includes(selectedModel)) {
      console.error('Invalid model:', selectedModel)
      return new Response(
        JSON.stringify({ error: `Invalid model. Must be one of: ${validModels.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate prompt length based on model
    const maxLengths = { 'V3_5': 3000, 'V4': 3000, 'V4_5': 5000 }
    const maxLength = maxLengths[selectedModel as keyof typeof maxLengths]
    if (prompt.length > maxLength) {
      console.error(`Prompt too long for ${selectedModel}: ${prompt.length} > ${maxLength}`)
      return new Response(
        JSON.stringify({ 
          error: `Prompt too long for ${selectedModel}. Maximum ${maxLength} characters, got ${prompt.length}` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate custom mode requirements
    if (customMode && (!style || !title)) {
      console.error('Custom mode requires style and title')
      return new Response(
        JSON.stringify({ error: 'Custom mode requires both style and title' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user profile using service role to bypass RLS
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', user.id)
      .single()

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
    const songTitle = title || `Generated ${style || 'AI'} Song`
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

    // Prepare the correct Suno API request payload
    const sunoRequest = {
      prompt: prompt,
      style: style || undefined,
      title: songTitle,
      instrumental: instrumental || false,
      customMode: customMode || false,
      model: selectedModel,
      negativeTags: negativeTags || undefined,
      callBackUrl: `${supabaseUrl}/functions/v1/suno-callback`
    }

    console.log('Suno request payload:', JSON.stringify(sunoRequest, null, 2))

    // Make the correct Suno API request to the right endpoint
    console.log('Making Suno API request to correct endpoint...')
    const sunoResponse = await fetch('https://apibox.erweima.ai/api/v1/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sunoApiKey}`
      },
      body: JSON.stringify(sunoRequest)
    })

    console.log('=== SUNO API RESPONSE DEBUG ===')
    console.log('Response status:', sunoResponse.status)
    console.log('Response ok:', sunoResponse.ok)
    
    const responseText = await sunoResponse.text()
    console.log('Raw response text:', responseText)
    
    // Try to parse as JSON
    let sunoData
    try {
      sunoData = JSON.parse(responseText)
      console.log('Parsed response data:', JSON.stringify(sunoData, null, 2))
    } catch (parseError) {
      console.error('Failed to parse response as JSON:', parseError)
      
      await supabase
        .from('songs')
        .update({ 
          status: 'rejected',
          audio_url: `parse_error_${sunoResponse.status}: ${responseText}`
        })
        .eq('id', song.id)
      
      return new Response(
        JSON.stringify({ 
          error: 'Invalid response from Suno API',
          details: responseText,
          status: sunoResponse.status
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    if (!sunoResponse.ok) {
      console.error('=== SUNO API ERROR ===')
      console.error('Status:', sunoResponse.status)
      console.error('Error data:', sunoData)
      console.error('Error message:', sunoData?.msg || sunoData?.message || 'Unknown error')
      
      // Update song with detailed error
      await supabase
        .from('songs')
        .update({ 
          status: 'rejected',
          audio_url: `error_${sunoResponse.status}: ${JSON.stringify(sunoData)}`
        })
        .eq('id', song.id)
      
      // Return detailed error information with specific debugging
      const errorMessage = sunoData?.msg || sunoData?.message || 'Unknown error'
      let debugHint = ''
      
      if (sunoResponse.status === 401) {
        debugHint = 'Check API key validity'
      } else if (sunoResponse.status === 413) {
        debugHint = 'Prompt too long for selected model'
      } else if (sunoResponse.status === 429) {
        debugHint = 'Insufficient credits on Suno account'
      } else if (sunoResponse.status === 400) {
        debugHint = 'Invalid request format or missing required fields'
      }
      
      return new Response(
        JSON.stringify({ 
          error: `Suno API Error (${sunoResponse.status}): ${errorMessage}`,
          details: sunoData,
          debugHint: debugHint,
          payload: sunoRequest
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle successful response
    if (sunoData && (sunoData.data || sunoData.task_id || sunoData.id)) {
      const taskId = sunoData.task_id || sunoData.id || sunoData.data?.task_id || sunoData.data?.id
      
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
            message: 'Song generation started successfully'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // If we get here, something went wrong with the response structure
    console.error('Unexpected response structure:', sunoData)
    await supabase
      .from('songs')
      .update({ 
        status: 'rejected',
        audio_url: `unexpected_response: ${JSON.stringify(sunoData)}`
      })
      .eq('id', song.id)
      
    return new Response(
      JSON.stringify({ 
        error: 'Unexpected response structure from Suno',
        details: sunoData
      }),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('=== UNEXPECTED ERROR ===')
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    console.error('Full error object:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message,
        type: error.name
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
