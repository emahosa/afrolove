
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
    task_id?: string;
    taskId?: string;
    id?: string;
  };
  task_id?: string;
  id?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const sunoApiKey = Deno.env.get('SUNO_API_KEY')
    console.log('🔑 SUNO_API_KEY status:', sunoApiKey ? `Present (${sunoApiKey.substring(0, 10)}...)` : 'MISSING')
    
    if (!sunoApiKey) {
      console.error('❌ SUNO_API_KEY not configured')
      return new Response(
        JSON.stringify({ error: 'SUNO_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Supabase configuration missing')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
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
      console.error('❌ Authentication failed:', authError)
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ User authenticated:', user.id)

    // Parse request body
    const requestBody: SunoGenerateRequest = await req.json()
    const { prompt, style, title, instrumental, customMode, model, negativeTags } = requestBody

    console.log('📝 Request payload:', JSON.stringify(requestBody, null, 2))

    // Validate required fields
    if (!prompt?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check user credits
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('❌ Failed to get user profile:', profileError)
      return new Response(
        JSON.stringify({ error: 'Failed to get user profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userCredits = profile?.credits || 0
    console.log('💳 User credits:', userCredits)
    
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
      console.error('❌ Failed to create song record:', songError)
      return new Response(
        JSON.stringify({ error: 'Failed to create song record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Song record created:', song.id)

    // Deduct credits
    await supabase
      .from('profiles')
      .update({ credits: userCredits - 5 })
      .eq('id', user.id)

    console.log('💳 Credits deducted, new balance:', userCredits - 5)

    // Prepare Suno API request with proper callback URL
    const sunoRequest: any = {
      prompt: prompt.trim(),
      instrumental: instrumental || false,
      model: model || 'V4_5'
    }

    // Set the callback URL to our Supabase edge function
    sunoRequest.callBackUrl = `${supabaseUrl}/functions/v1/suno-callback`
    console.log('🔗 Callback URL set to:', sunoRequest.callBackUrl)

    if (customMode) {
      if (style?.trim()) {
        sunoRequest.style = style.trim()
      }
      if (title?.trim()) {
        sunoRequest.title = title.trim()
      }
      sunoRequest.customMode = true
      if (negativeTags?.trim()) {
        sunoRequest.negativeTags = negativeTags.trim()
      }
    } else {
      sunoRequest.customMode = false
    }

    console.log('🎵 Suno API request payload:', JSON.stringify(sunoRequest, null, 2))

    // Make Suno API request with detailed error logging
    console.log('🚀 Making request to Suno API...')
    
    let sunoResponse: Response
    try {
      sunoResponse = await fetch('https://apibox.erweima.ai/api/v1/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sunoApiKey}`
        },
        body: JSON.stringify(sunoRequest)
      })
    } catch (fetchError) {
      console.error('❌ Network error calling Suno API:', fetchError)
      
      await supabase
        .from('songs')
        .update({ 
          status: 'rejected',
          audio_url: `network_error: ${fetchError.message}`
        })
        .eq('id', song.id)
      
      return new Response(
        JSON.stringify({ 
          error: 'Network error calling Suno API',
          details: fetchError.message
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('📡 Suno API response status:', sunoResponse.status)
    console.log('📡 Suno API response headers:', Object.fromEntries(sunoResponse.headers.entries()))

    const responseText = await sunoResponse.text()
    console.log('📡 Suno API raw response body:', responseText)

    let sunoData: SunoApiResponse

    try {
      sunoData = JSON.parse(responseText)
      console.log('📊 Parsed Suno API response:', JSON.stringify(sunoData, null, 2))
    } catch (parseError) {
      console.error('❌ Failed to parse Suno API response as JSON:', parseError)
      console.error('❌ Raw response that failed to parse:', responseText)
      
      await supabase
        .from('songs')
        .update({ 
          status: 'rejected',
          audio_url: `parse_error: ${responseText.substring(0, 500)}`
        })
        .eq('id', song.id)
      
      return new Response(
        JSON.stringify({ 
          error: 'Invalid response from Suno API',
          details: responseText.substring(0, 500),
          status: sunoResponse.status
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    if (!sunoResponse.ok) {
      console.error('❌ Suno API returned error status:', sunoResponse.status)
      console.error('❌ Suno API error response:', JSON.stringify(sunoData, null, 2))
      
      // Log specific error details
      if (sunoData.msg) {
        console.error('❌ Suno API error message:', sunoData.msg)
      }
      if (sunoData.code) {
        console.error('❌ Suno API error code:', sunoData.code)
      }
      
      await supabase
        .from('songs')
        .update({ 
          status: 'rejected',
          audio_url: `suno_api_error_${sunoResponse.status}: ${sunoData.msg || 'Unknown error'}`
        })
        .eq('id', song.id)
      
      return new Response(
        JSON.stringify({ 
          error: `Suno API Error (${sunoResponse.status}): ${sunoData.msg || 'Unknown error'}`,
          details: sunoData,
          status: sunoResponse.status,
          suno_code: sunoData.code
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle successful response - Fix task ID extraction to handle actual API response format
    const taskId = sunoData.data?.taskId || sunoData.data?.task_id || sunoData.task_id || sunoData.data?.id || sunoData.id
    console.log('🎯 Extracted task ID:', taskId)
    
    if (taskId) {
      await supabase
        .from('songs')
        .update({ 
          audio_url: `task_pending:${taskId}`,
          status: 'pending'
        })
        .eq('id', song.id)

      console.log('✅ Song generation started successfully with task ID:', taskId)
      console.log('🔗 Callback will be received at:', sunoRequest.callBackUrl)

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

    // If no task ID, mark as failed
    console.error('❌ No task ID found in successful response:', JSON.stringify(sunoData, null, 2))
    
    await supabase
      .from('songs')
      .update({ 
        status: 'rejected',
        audio_url: `no_task_id: ${JSON.stringify(sunoData)}`
      })
      .eq('id', song.id)
      
    return new Response(
      JSON.stringify({ 
        error: 'No task ID received from Suno API',
        details: sunoData
      }),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('💥 Fatal error in suno-generate:', error)
    console.error('💥 Error stack:', error.stack)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
