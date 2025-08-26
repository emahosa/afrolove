
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
  console.log('📋 Request URL:', req.url)
  console.log('⏰ Request time:', new Date().toISOString())

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const sunoApiKey = Deno.env.get('SUNO_API_KEY')
    
    console.log('🔑 Checking SUNO_API_KEY...')
    console.log('🔑 API Key exists:', !!sunoApiKey)
    console.log('🔑 API Key length:', sunoApiKey?.length || 0)
    console.log('🔑 API Key prefix:', sunoApiKey?.substring(0, 10) + '...' || 'undefined')
    
    if (!sunoApiKey) {
      console.error('❌ SUNO_API_KEY not configured')
      return new Response(JSON.stringify({ error: 'SUNO_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body = await req.json()
    
    const { 
      prompt, 
      style, 
      title, 
      instrumental = false, 
      customMode = false,
      model = 'V3_5',
      negativeTags,
      userId,
      isAdminTest = false
    } = body

    console.log('📥 Generation request received:', {
      userId,
      prompt: prompt?.substring(0, 100) + '...',
      style,
      title,
      instrumental,
      customMode,
      model
    })

    if (!userId) {
      console.error('❌ User ID missing')
      return new Response(JSON.stringify({ error: 'User ID required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!prompt || prompt.trim() === '') {
      console.error('❌ Prompt missing or empty')
      return new Response(JSON.stringify({ 
        error: 'Prompt is required',
        success: false 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!isAdminTest) {
      // --- START ROLE CHECK ---
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      const { data: subscription, error: subError } = await supabase
        .from('user_subscriptions')
        .select('subscription_status, expires_at')
        .eq('user_id', userId)
        .maybeSingle();

      if (rolesError) {
        console.error(`Error fetching roles for user ${userId}:`, rolesError.message);
        return new Response(JSON.stringify({ error: 'Failed to verify user permissions (roles).' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (subError && subError.code !== 'PGRST116') { // PGRST116 = Not Found
        console.error(`Error fetching subscription for user ${userId}:`, subError.message);
        return new Response(JSON.stringify({ error: 'Failed to verify user permissions (subscription).' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const hasSufficientRole = userRoles?.some(r => (r as {role: string}).role === 'subscriber');
      const isActiveSubscription = subscription?.subscription_status === 'active' && (!subscription.expires_at || new Date(subscription.expires_at) > new Date());

      // User must have a qualifying role (subscriber) AND an active subscription to use generation.
      // Admins bypass this check if isAdminTest=true.
      if (!hasSufficientRole || !isActiveSubscription) {
        console.log(`User ${userId} lacks role or active subscription for song generation. HasRole: ${hasSufficientRole}, ActiveSub: ${isActiveSubscription}. Access denied.`);
        return new Response(JSON.stringify({ error: 'Access denied. Song generation requires an active subscription and appropriate role.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      // --- END ROLE CHECK ---

      // Check user credits - now requiring 40 credits
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', userId)
        .single()

      if (profileError || !userProfile) {
        console.error('❌ User profile not found:', profileError)
        return new Response(JSON.stringify({ 
          error: 'User not found',
          success: false 
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Ensure user has enough credits
      if (userProfile.credits < 40) {
        console.log('❌ Insufficient credits for user:', userId, 'Credits:', userProfile.credits)
        return new Response(JSON.stringify({ 
          error: 'Insufficient credits. You need at least 40 credits to generate a song.',
          success: false 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // Create a callback URL for the Suno API
    const callBackUrl = `${supabaseUrl}/functions/v1/suno-webhook`

    // Prepare the Suno API request using the correct format from documentation
    const sunoRequestBody: any = {
      prompt: prompt.trim(),
      customMode: customMode,
      instrumental: instrumental,
      model: model,
      callBackUrl: callBackUrl,
      wait_audio: false
    }

    // Add optional fields based on mode
    if (customMode) {
      if (style) sunoRequestBody.style = style
      if (title) sunoRequestBody.title = title
    }

    if (negativeTags) {
      sunoRequestBody.negativeTags = negativeTags
    }

    console.log('🎵 Sending request to Suno API')
    console.log('🎵 Request body:', JSON.stringify(sunoRequestBody, null, 2))
    console.log('🎵 Using API Key ending in:', sunoApiKey.slice(-4))

    // Use the correct endpoint from documentation
    let sunoResponse;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {
      sunoResponse = await fetch('https://apibox.erweima.ai/api/v1/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sunoApiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(sunoRequestBody),
        signal: controller.signal
      })
    } catch (e) {
      if (e.name === 'AbortError') {
        console.error('❌ Suno API request timed out.')
        return new Response(JSON.stringify({ 
          error: 'Music generation service took too long to respond. Please try again.',
          errorCode: 'SUNO_API_TIMEOUT',
          success: false 
        }), {
          status: 504,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      throw e;
    } finally {
      clearTimeout(timeoutId);
    }

    console.log('📥 Suno API response status:', sunoResponse.status)
    console.log('📥 Suno API response headers:', Object.fromEntries(sunoResponse.headers.entries()))
    
    const responseText = await sunoResponse.text()
    console.log('📥 Suno API response body:', responseText)

    if (!sunoResponse.ok) {
      console.error('❌ Suno API error:', sunoResponse.status, responseText)
      
      let errorMessage = 'Suno API request failed'
      let errorCode = 'SUNO_API_ERROR'
      
      try {
        const errorData = JSON.parse(responseText)
        errorMessage = errorData.msg || errorData.message || errorData.error?.message || errorMessage
        
        if (sunoResponse.status === 401) {
          errorCode = 'SUNO_API_UNAUTHORIZED'
          errorMessage = 'Suno API key is invalid or expired. Please check your API key configuration.'
        } else if (sunoResponse.status === 403) {
          errorCode = 'SUNO_API_FORBIDDEN'
          errorMessage = 'Suno API access forbidden. Your account may have insufficient credits or permissions.'
        } else if (sunoResponse.status === 429) {
          errorCode = 'SUNO_API_RATE_LIMIT'
          errorMessage = 'Suno API rate limit exceeded or insufficient credits. Please try again later.'
        }
      } catch (parseError) {
        console.error('❌ Failed to parse error response:', parseError)
        errorMessage = responseText || errorMessage
      }

      return new Response(JSON.stringify({ 
        error: errorMessage,
        errorCode: errorCode,
        success: false 
      }), {
        status: sunoResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    let responseData
    try {
      responseData = JSON.parse(responseText)
    } catch (parseError) {
      console.error('❌ Failed to parse success response:', parseError)
      return new Response(JSON.stringify({ 
        error: 'Invalid response format from Suno API',
        success: false
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('📋 Parsed Suno response:', responseData)

    if (responseData.code !== 200) {
      console.error('❌ Suno API returned error code:', responseData.code, responseData.msg)
      return new Response(JSON.stringify({ 
        error: responseData.msg || 'Suno API returned an error',
        success: false
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Extract task ID from the response
    let taskId = null
    
    if (responseData.data) {
      if (responseData.data.taskId) {
        taskId = responseData.data.taskId;
      } else if (responseData.data.task_id) {
        taskId = responseData.data.task_id;
      } else if (typeof responseData.data === 'string') {
        taskId = responseData.data;
      }
    } else if (responseData.taskId) {
      taskId = responseData.taskId;
    } else if (responseData.task_id) {
      taskId = responseData.task_id;
    }

    if (!taskId) {
      console.error('❌ No task ID found in response', responseData)
      return new Response(JSON.stringify({ 
        error: 'No task ID received from Suno API',
        details: responseData,
        success: false
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('✅ Task ID received:', taskId)

    if (!isAdminTest) {
      // Deduct 40 credits
      const { error: creditError } = await supabase.rpc('update_user_credits', {
        p_user_id: userId,
        p_amount: -40
      })

      if (creditError) {
        console.error('❌ Failed to deduct credits:', creditError)
      } else {
        console.log('✅ 40 credits deducted for user:', userId)
      }
    }

    // Create song record with the task_id properly stored
    const songData = {
      user_id: userId,
      title: title || 'Generating...',
      type: instrumental ? 'instrumental' : 'song',
      prompt,
      status: 'pending',
      credits_used: isAdminTest ? 0 : 40,
      task_id: taskId
    }

    console.log('💾 Creating song record with data:', songData)

    const { data: newSong, error: songError } = await supabase
      .from('songs')
      .insert(songData)
      .select()
      .single()

    if (songError) {
      console.error('❌ Failed to create song record:', songError)
      return new Response(JSON.stringify({ 
        error: 'Failed to create song record',
        success: false 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('✅ Song record created with ID:', newSong.id)
    console.log('🎉 GENERATION REQUEST COMPLETED SUCCESSFULLY')

    return new Response(JSON.stringify({ 
      success: true,
      taskId: taskId, // Changed from task_id to match client expectation
      song_id: newSong.id,
      message: 'Song generation started successfully'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('💥 CRITICAL ERROR in suno-generate function:', error)
    console.error('💥 Error stack:', error.stack)
    console.error('💥 Error occurred at:', new Date().toISOString())
    
    return new Response(JSON.stringify({ 
      error: 'Internal server error: ' + error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
