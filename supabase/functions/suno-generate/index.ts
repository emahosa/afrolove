
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const sunoApiKey = Deno.env.get('SUNO_API_KEY')
    
    if (!sunoApiKey) {
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
      instrumental, 
      customMode,
      model = 'V3_5',
      negativeTags,
      userId
    } = body

    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Validate required fields
    if (customMode && (!style || !title)) {
      return new Response(JSON.stringify({ 
        error: 'Custom mode requires both style and title fields',
        success: false 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!prompt || prompt.trim() === '') {
      return new Response(JSON.stringify({ 
        error: 'Prompt is required',
        success: false 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (prompt.length > 200) {
      return new Response(JSON.stringify({ 
        error: 'Prompt too long. Maximum 200 characters allowed.',
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

    // Prepare the webhook callback URL - use the correct format
    const webhookUrl = `${supabaseUrl}/functions/v1/suno-webhook`

    // Prepare the Suno API request with proper callback URL
    const sunoRequestBody = {
      prompt: prompt.trim(),
      customMode,
      instrumental,
      model,
      callBackUrl: webhookUrl
    }

    // Add optional fields if provided
    if (customMode) {
      sunoRequestBody.style = style
      sunoRequestBody.title = title
    }

    if (negativeTags) {
      sunoRequestBody.negativeTags = negativeTags
    }

    console.log('🎵 Making Suno API request:', JSON.stringify(sunoRequestBody, null, 2))
    console.log('🔗 Webhook URL:', webhookUrl)

    // Try multiple API endpoints in case one fails
    const endpoints = [
      'https://api.sunoaiapi.com/api/v1/gateway/generate/music',
      'https://apibox.erweima.ai/api/v1/generate'
    ]

    let response
    let lastError
    let usedEndpoint

    for (const endpoint of endpoints) {
      try {
        console.log(`🔄 Trying endpoint: ${endpoint}`)
        
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sunoApiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(sunoRequestBody)
        })

        console.log(`📥 Response status: ${response.status}`)
        
        if (response.ok) {
          usedEndpoint = endpoint
          console.log(`✅ Success with endpoint: ${endpoint}`)
          break
        } else {
          const errorText = await response.text()
          lastError = `${endpoint}: ${response.status} ${errorText}`
          console.log(`❌ Failed with ${endpoint}: ${response.status} ${errorText}`)
        }
      } catch (error) {
        lastError = `${endpoint}: ${error.message}`
        console.log(`❌ Error with ${endpoint}:`, error.message)
      }
    }

    if (!response || !response.ok) {
      if (response?.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Suno API rate limit exceeded. Please try again later.',
          success: false 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      return new Response(JSON.stringify({ 
        error: `All Suno API endpoints failed: ${lastError}`,
        success: false 
      }), {
        status: response?.status || 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const responseText = await response.text()
    console.log('📥 Suno API raw response:', responseText)

    let responseData
    try {
      responseData = JSON.parse(responseText)
    } catch (parseError) {
      return new Response(JSON.stringify({ 
        error: 'Invalid response from Suno API',
        success: false 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('📋 Parsed Suno response:', JSON.stringify(responseData, null, 2))

    // Extract task ID from different possible response formats
    let taskId
    if (responseData.data?.taskId) {
      taskId = responseData.data.taskId
    } else if (responseData.taskId) {
      taskId = responseData.taskId
    } else if (responseData.data?.id) {
      taskId = responseData.data.id
    } else if (responseData.id) {
      taskId = responseData.id
    }

    if (!taskId) {
      const errorMsg = responseData.error || responseData.message || 'No task ID received from Suno API'
      return new Response(JSON.stringify({ 
        error: errorMsg,
        success: false,
        debug: responseData
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('✅ Got task ID from Suno:', taskId, 'using endpoint:', usedEndpoint)

    // Deduct credits
    const { error: creditError } = await supabase.rpc('update_user_credits', {
      p_user_id: userId,
      p_amount: -5
    })

    if (creditError) {
      console.error('Failed to deduct credits:', creditError)
    }

    // Create song record with task ID stored in audio_url field for lookup
    const songData = {
      user_id: userId,
      title: title || 'Generating...',
      type: instrumental ? 'instrumental' : 'song',
      audio_url: taskId, // Store task ID here for lookup
      prompt,
      status: 'pending',
      credits_used: 5
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

    console.log('✅ Created song record:', newSong.id, 'with task ID:', taskId)

    const successResponse = { 
      success: true,
      task_id: taskId,
      song_id: newSong.id,
      endpoint_used: usedEndpoint,
      webhook_url: webhookUrl,
      message: 'Song generation started successfully. You will receive a webhook notification when complete.'
    }

    console.log('🎉 Returning success response:', successResponse)

    return new Response(JSON.stringify(successResponse), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('💥 Critical error in generation:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal error: ' + error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
