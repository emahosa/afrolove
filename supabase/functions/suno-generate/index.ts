
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SunoGenerateRequest {
  prompt: string;
  style?: string;
  title?: string;
  instrumental: boolean;
  customMode: boolean;
  model: 'V3_5' | 'V4' | 'V4_5';
  negativeTags?: string;
  requestId?: string;
  userId?: string;
}

interface SunoApiResponse {
  code: number;
  msg: string;
  data?: {
    task_id: string;
    id?: string;
  };
  task_id?: string;
  id?: string;
}

Deno.serve(async (req) => {
  console.log('=== SUNO GENERATE FUNCTION START ===')
  console.log('Method:', req.method)
  console.log('URL:', req.url)
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get API key and log its status
    const sunoApiKey = Deno.env.get('SUNO_API_KEY')
    console.log('API Key check:')
    console.log('- Key exists:', !!sunoApiKey)
    console.log('- Key length:', sunoApiKey?.length || 0)
    console.log('- Key preview:', sunoApiKey ? `${sunoApiKey.substring(0, 10)}...` : 'null')
    
    if (!sunoApiKey) {
      console.error('❌ SUNO_API_KEY environment variable is not set')
      return new Response(
        JSON.stringify({ error: 'SUNO_API_KEY not configured in environment variables' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (sunoApiKey.length < 10) {
      console.error('❌ SUNO_API_KEY appears to be invalid (too short)')
      return new Response(
        JSON.stringify({ error: 'SUNO_API_KEY appears to be invalid' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing Supabase environment variables')
      return new Response(
        JSON.stringify({ error: 'Server configuration error - missing Supabase config' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Verify authentication
    const authorization = req.headers.get('Authorization')
    if (!authorization) {
      console.error('❌ No authorization header')
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authorization.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      console.error('❌ Auth error:', authError)
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ User authenticated:', user.id)

    // Parse request body
    let requestBody: SunoGenerateRequest
    try {
      requestBody = await req.json()
      console.log('✅ Request body parsed:', JSON.stringify(requestBody, null, 2))
    } catch (error) {
      console.error('❌ Invalid JSON:', error)
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { prompt, style, title, instrumental, customMode, model, negativeTags } = requestBody

    // Validate required fields
    if (!prompt?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate model
    const validModels = ['V3_5', 'V4', 'V4_5']
    const selectedModel = model || 'V3_5'
    if (!validModels.includes(selectedModel)) {
      return new Response(
        JSON.stringify({ error: `Invalid model. Must be one of: ${validModels.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate prompt length based on mode and model
    let maxLength: number
    if (customMode) {
      maxLength = selectedModel === 'V4_5' ? 5000 : 3000
    } else {
      maxLength = 400
    }

    if (prompt.length > maxLength) {
      const mode = customMode ? 'Lyric Input Mode' : 'Prompt Mode'
      return new Response(
        JSON.stringify({ 
          error: `Prompt too long for ${mode} with ${selectedModel}. Maximum ${maxLength} characters, got ${prompt.length}` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate custom mode requirements
    if (customMode && (!style?.trim() || !title?.trim())) {
      return new Response(
        JSON.stringify({ error: 'Lyric Input Mode requires both style and title' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check user credits (using service role to bypass RLS)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('❌ Profile error:', profileError)
      return new Response(
        JSON.stringify({ error: 'Failed to get user profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userCredits = profile?.credits || 0
    console.log('✅ User credits:', userCredits)

    if (userCredits < 5) {
      return new Response(
        JSON.stringify({ 
          error: 'Insufficient credits. You need 5 credits to generate a song.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create song record first
    const songTitle = title || `Generated ${style || 'AI'} Song`
    console.log('✅ Creating song record:', songTitle)
    
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
      console.error('❌ Song creation error:', songError)
      return new Response(
        JSON.stringify({ error: 'Failed to create song record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Song created with ID:', song.id)

    // Deduct credits
    const { error: creditError } = await supabase
      .from('profiles')
      .update({ credits: userCredits - 5 })
      .eq('id', user.id)

    if (creditError) {
      console.error('⚠️ Credit deduction error:', creditError)
    } else {
      console.log('✅ Credits deducted successfully')
    }

    // Prepare Suno API request payload
    const sunoRequest: any = {
      prompt: prompt.trim(),
      instrumental: instrumental || false,
      model: selectedModel,
      callBackUrl: `${supabaseUrl}/functions/v1/suno-callback`
    }

    // Add fields based on mode
    if (customMode) {
      sunoRequest.style = style?.trim()
      sunoRequest.title = songTitle
      sunoRequest.customMode = true
      if (negativeTags?.trim()) {
        sunoRequest.negativeTags = negativeTags.trim()
      }
    } else {
      sunoRequest.customMode = false
    }

    console.log('✅ Suno request payload:', JSON.stringify(sunoRequest, null, 2))

    // Make Suno API request
    console.log('🚀 Making Suno API request...')
    const sunoResponse = await fetch('https://apibox.erweima.ai/api/v1/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sunoApiKey}`
      },
      body: JSON.stringify(sunoRequest)
    })

    console.log('📡 Suno API response status:', sunoResponse.status)
    console.log('📡 Suno API response ok:', sunoResponse.ok)
    
    const responseText = await sunoResponse.text()
    console.log('📡 Suno API raw response:', responseText)
    
    let sunoData: SunoApiResponse
    try {
      sunoData = JSON.parse(responseText)
      console.log('✅ Parsed Suno response:', JSON.stringify(sunoData, null, 2))
    } catch (parseError) {
      console.error('❌ Failed to parse Suno response as JSON:', parseError)
      
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
      console.error('❌ Suno API error:', sunoResponse.status, sunoData)
      
      await supabase
        .from('songs')
        .update({ 
          status: 'rejected',
          audio_url: `error_${sunoResponse.status}: ${JSON.stringify(sunoData)}`
        })
        .eq('id', song.id)
      
      let errorMessage = 'Unknown error'
      
      if (sunoData.msg) {
        errorMessage = sunoData.msg
      }
      
      return new Response(
        JSON.stringify({ 
          error: `Suno API Error (${sunoResponse.status}): ${errorMessage}`,
          details: sunoData
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle successful response
    const taskId = sunoData.task_id || sunoData.data?.task_id || sunoData.id || sunoData.data?.id
    
    if (taskId) {
      await supabase
        .from('songs')
        .update({ 
          audio_url: `task_pending:${taskId}`,
          status: 'pending'
        })
        .eq('id', song.id)

      console.log('🎉 Success! Task ID:', taskId)
      
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

    // If we get here, something went wrong with the response structure
    console.error('❌ Unexpected response structure:', sunoData)
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
    console.error('❌ Unexpected error:', error)
    
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
