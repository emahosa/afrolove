
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  console.log('🚀 SUNO GENERATE FUNCTION STARTED')
  console.log('📋 Request method:', req.method)
  console.log('⏰ Request time:', new Date().toISOString())

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Step 1: Check API key
    const sunoApiKey = Deno.env.get('SUNO_API_KEY')
    console.log('🔑 API Key check:', sunoApiKey ? 'API key found' : 'API key missing')
    
    if (!sunoApiKey) {
      console.error('❌ SUNO_API_KEY not configured')
      return new Response(JSON.stringify({ 
        error: 'SUNO_API_KEY not configured',
        success: false,
        debug: { step: 'api_key_check', issue: 'missing_api_key' }
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Step 2: Parse request body
    let body
    try {
      body = await req.json()
      console.log('📥 Request body parsed successfully')
      console.log('📋 Body keys:', Object.keys(body))
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError)
      return new Response(JSON.stringify({ 
        error: 'Invalid JSON in request body',
        success: false,
        debug: { step: 'body_parsing', issue: 'invalid_json', error: parseError.message }
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { 
      prompt, 
      style, 
      title, 
      instrumental = false, 
      customMode = false,
      model = 'V4',
      negativeTags,
      userId
    } = body

    console.log('📥 Generation request:', {
      userId: userId ? 'provided' : 'missing',
      prompt: prompt ? `${prompt.substring(0, 50)}...` : 'missing',
      style: style || 'not provided',
      title: title || 'not provided',
      instrumental,
      customMode,
      model
    })

    // Step 3: Validate user ID
    if (!userId) {
      console.error('❌ User ID missing')
      return new Response(JSON.stringify({ 
        error: 'User ID required',
        success: false,
        debug: { step: 'user_validation', issue: 'missing_user_id' }
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Step 4: Validate prompt
    if (!prompt?.trim()) {
      console.error('❌ Prompt missing or empty')
      return new Response(JSON.stringify({ 
        error: 'Prompt is required',
        success: false,
        debug: { step: 'prompt_validation', issue: 'missing_prompt' }
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Step 5: Initialize Supabase client
    let supabase
    try {
      supabase = createClient(supabaseUrl, supabaseServiceKey)
      console.log('✅ Supabase client initialized')
    } catch (supabaseError) {
      console.error('❌ Failed to initialize Supabase client:', supabaseError)
      return new Response(JSON.stringify({ 
        error: 'Database connection failed',
        success: false,
        debug: { step: 'supabase_init', issue: 'client_creation_failed', error: supabaseError.message }
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Step 6: Check user credits
    let userProfile
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', userId)
        .single()

      console.log('💳 Credits check result:', profileError ? 'error' : 'success')
      console.log('💳 Profile data:', profileData)
      
      if (profileError) {
        console.error('❌ Profile query error:', profileError)
        return new Response(JSON.stringify({ 
          error: 'User profile not found',
          success: false,
          debug: { step: 'credits_check', issue: 'profile_query_failed', error: profileError.message }
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      userProfile = profileData
    } catch (creditsError) {
      console.error('❌ Credits check failed:', creditsError)
      return new Response(JSON.stringify({ 
        error: 'Credits check failed',
        success: false,
        debug: { step: 'credits_check', issue: 'query_exception', error: creditsError.message }
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (userProfile.credits < 5) {
      console.log('❌ Insufficient credits:', userProfile.credits)
      return new Response(JSON.stringify({ 
        error: 'Insufficient credits. You need at least 5 credits to generate a song.',
        success: false,
        debug: { step: 'credits_validation', issue: 'insufficient_credits', current: userProfile.credits, required: 5 }
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('✅ Credits validated:', userProfile.credits)

    // Step 7: Prepare Suno API request
    const sunoRequestBody = {
      prompt: prompt.trim(),
      customMode: customMode,
      instrumental: instrumental,
      model: model,
      callBackUrl: `${supabaseUrl}/functions/v1/suno-webhook`
    }

    // Add conditional fields based on customMode
    if (customMode) {
      if (title) {
        sunoRequestBody.title = title
      }
      if (style) {
        sunoRequestBody.style = style
      }
    }

    if (negativeTags) {
      sunoRequestBody.negativeTags = negativeTags
    }

    console.log('🎵 Suno API request prepared')
    console.log('🎵 Request URL: https://apibox.erweima.ai/api/v1/generate')
    console.log('🎵 Request body keys:', Object.keys(sunoRequestBody))
    console.log('🎵 Auth header:', sunoApiKey ? 'Bearer token prepared' : 'No auth token')

    // Step 8: Call Suno API
    let sunoResponse
    try {
      console.log('📤 Making Suno API call...')
      sunoResponse = await fetch('https://apibox.erweima.ai/api/v1/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sunoApiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(sunoRequestBody)
      })

      console.log('📥 Suno API response status:', sunoResponse.status)
      console.log('📥 Suno API response headers:', Object.fromEntries(sunoResponse.headers.entries()))
      
    } catch (fetchError) {
      console.error('❌ Suno API fetch failed:', fetchError)
      return new Response(JSON.stringify({ 
        error: 'Failed to connect to Suno API',
        success: false,
        debug: { step: 'suno_api_call', issue: 'fetch_failed', error: fetchError.message }
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Step 9: Parse Suno API response
    let responseText
    try {
      responseText = await sunoResponse.text()
      console.log('📥 Suno API response body length:', responseText.length)
      console.log('📥 Suno API response body preview:', responseText.substring(0, 200) + '...')
    } catch (textError) {
      console.error('❌ Failed to read response text:', textError)
      return new Response(JSON.stringify({ 
        error: 'Failed to read API response',
        success: false,
        debug: { step: 'response_reading', issue: 'text_parsing_failed', error: textError.message }
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!sunoResponse.ok) {
      console.error('❌ Suno API error response:', sunoResponse.status, responseText)
      
      let errorMessage = 'Suno API request failed'
      let debugInfo = { 
        step: 'suno_api_response', 
        issue: 'non_2xx_status', 
        status: sunoResponse.status,
        responseBody: responseText
      }
      
      try {
        const errorData = JSON.parse(responseText)
        errorMessage = errorData.msg || errorData.message || errorData.error || errorMessage
        debugInfo.parsedError = errorData
      } catch (parseError) {
        debugInfo.parseError = 'Could not parse error response as JSON'
      }

      return new Response(JSON.stringify({ 
        error: errorMessage,
        success: false,
        debug: debugInfo
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Step 10: Parse successful response
    let responseData
    try {
      responseData = JSON.parse(responseText)
      console.log('📋 Parsed Suno response structure:', {
        code: responseData.code,
        msg: responseData.msg,
        hasData: !!responseData.data,
        dataKeys: responseData.data ? Object.keys(responseData.data) : []
      })
    } catch (parseError) {
      console.error('❌ Failed to parse success response:', parseError)
      return new Response(JSON.stringify({ 
        error: 'Invalid response format from Suno API',
        success: false,
        debug: { step: 'response_parsing', issue: 'json_parse_failed', responseText }
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Step 11: Extract task ID
    let taskId = null
    
    if (responseData.code === 200 && responseData.data && responseData.data.task_id) {
      taskId = responseData.data.task_id
      console.log('✅ Task ID extracted:', taskId)
    } else {
      console.error('❌ No task ID found in response')
      console.log('❌ Response structure debug:', JSON.stringify(responseData, null, 2))
      return new Response(JSON.stringify({ 
        error: 'No task ID received from Suno API',
        success: false,
        debug: { 
          step: 'task_id_extraction', 
          issue: 'missing_task_id', 
          responseData: responseData,
          expectedPath: 'data.task_id'
        }
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Step 12: Deduct credits
    try {
      console.log('💳 Deducting credits...')
      const { error: creditError } = await supabase.rpc('update_user_credits', {
        p_user_id: userId,
        p_amount: -5
      })

      if (creditError) {
        console.error('❌ Failed to deduct credits:', creditError)
        // Don't fail the whole operation, but log it
      } else {
        console.log('✅ Credits deducted successfully')
      }
    } catch (creditException) {
      console.error('❌ Credit deduction exception:', creditException)
    }

    // Step 13: Create song record
    let newSong
    try {
      const songData = {
        user_id: userId,
        title: title || 'AI Generated Song',
        type: instrumental ? 'instrumental' : 'song',
        audio_url: `pending:${taskId}`,
        prompt,
        lyrics: null,
        status: 'pending',
        credits_used: 5,
        vocal_url: null,
        instrumental_url: null
      }

      console.log('💾 Creating song record...')
      const { data: songRecord, error: songError } = await supabase
        .from('songs')
        .insert(songData)
        .select()
        .single()

      if (songError) {
        console.error('❌ Failed to create song record:', songError)
        return new Response(JSON.stringify({ 
          error: 'Failed to create song record',
          success: false,
          debug: { step: 'song_creation', issue: 'database_insert_failed', error: songError.message }
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      newSong = songRecord
      console.log('✅ Song record created with ID:', newSong.id)
    } catch (songException) {
      console.error('❌ Song creation exception:', songException)
      return new Response(JSON.stringify({ 
        error: 'Song creation failed',
        success: false,
        debug: { step: 'song_creation', issue: 'exception_thrown', error: songException.message }
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Step 14: Return success
    console.log('🎉 Generation process completed successfully!')
    return new Response(JSON.stringify({ 
      success: true,
      task_id: taskId,
      song_id: newSong.id,
      message: 'Song generation started successfully',
      debug: { step: 'completed', allStepsSuccessful: true }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('💥 CRITICAL UNHANDLED ERROR:', error)
    console.error('💥 Error stack:', error.stack)
    
    return new Response(JSON.stringify({ 
      error: 'Internal server error: ' + error.message,
      success: false,
      debug: { 
        step: 'unhandled_exception', 
        issue: 'critical_error', 
        error: error.message,
        stack: error.stack
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
