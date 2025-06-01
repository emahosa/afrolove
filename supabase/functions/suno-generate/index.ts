
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
    const sunoApiKey = Deno.env.get('SUNO_API_KEY')
    
    if (!sunoApiKey) {
      console.error('❌ SUNO_API_KEY not configured')
      return new Response(JSON.stringify({ 
        error: 'SUNO_API_KEY not configured',
        success: false 
      }), {
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
      userId
    } = body

    console.log('📥 Generation request:', {
      userId,
      prompt: prompt?.substring(0, 100) + '...',
      style,
      title,
      instrumental,
      customMode,
      model
    })

    if (!userId) {
      return new Response(JSON.stringify({ 
        error: 'User ID required',
        success: false 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!prompt?.trim()) {
      return new Response(JSON.stringify({ 
        error: 'Prompt is required',
        success: false 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check user credits
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

    if (userProfile.credits < 5) {
      return new Response(JSON.stringify({ 
        error: 'Insufficient credits. You need at least 5 credits to generate a song.',
        success: false 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Prepare request for Suno API according to documentation
    const sunoRequestBody = {
      prompt: prompt.trim(),
      customMode: customMode,
      instrumental: instrumental,
      model: model,
      callBackUrl: `${supabaseUrl}/functions/v1/suno-webhook`
    }

    // Add conditional fields based on customMode
    if (customMode) {
      if (!instrumental && style) {
        sunoRequestBody.style = style
      }
      if (style) {
        sunoRequestBody.style = style
      }
      if (title) {
        sunoRequestBody.title = title
      }
    }

    if (negativeTags) {
      sunoRequestBody.negativeTags = negativeTags
    }

    console.log('🎵 Calling Suno API /api/v1/generate')
    console.log('🎵 Request body:', JSON.stringify(sunoRequestBody, null, 2))

    // Use the correct Suno API endpoint from documentation
    const sunoResponse = await fetch('https://apibox.erweima.ai/api/v1/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sunoApiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(sunoRequestBody)
    })

    console.log('📥 Suno API response status:', sunoResponse.status)
    
    const responseText = await sunoResponse.text()
    console.log('📥 Suno API response body:', responseText)

    if (!sunoResponse.ok) {
      console.error('❌ Suno API error:', sunoResponse.status, responseText)
      
      let errorMessage = 'Suno API request failed'
      
      try {
        const errorData = JSON.parse(responseText)
        errorMessage = errorData.msg || errorData.message || errorData.error || errorMessage
      } catch (parseError) {
        errorMessage = responseText || errorMessage
      }

      return new Response(JSON.stringify({ 
        error: errorMessage,
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

    // Extract task ID from response according to documentation format
    let taskId = null
    
    if (responseData.code === 200 && responseData.data && responseData.data.task_id) {
      taskId = responseData.data.task_id
    }

    if (!taskId) {
      console.error('❌ No task ID found in response')
      return new Response(JSON.stringify({ 
        error: 'No task ID received from Suno API',
        success: false,
        debug: responseData
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('✅ Task ID received:', taskId)

    // Deduct credits
    const { error: creditError } = await supabase.rpc('update_user_credits', {
      p_user_id: userId,
      p_amount: -5
    })

    if (creditError) {
      console.error('❌ Failed to deduct credits:', creditError)
    } else {
      console.log('✅ Credits deducted for user:', userId)
    }

    // Create song record
    const songData = {
      user_id: userId,
      title: title || 'AI Generated Song',
      type: instrumental ? 'instrumental' : 'song',
      audio_url: taskId, // Store task ID for status checking
      prompt,
      lyrics: customMode && !instrumental ? prompt : null,
      status: 'pending',
      credits_used: 5,
      vocal_url: null,
      instrumental_url: null
    }

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

    return new Response(JSON.stringify({ 
      success: true,
      task_id: taskId,
      song_id: newSong.id,
      message: 'Song generation started successfully'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('💥 CRITICAL ERROR in suno-generate function:', error)
    
    return new Response(JSON.stringify({ 
      error: 'Internal server error: ' + error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
