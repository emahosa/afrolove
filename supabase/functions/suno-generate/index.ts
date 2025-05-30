
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

    // Prepare the Suno API request with correct callback URL
    const callbackUrl = `${supabaseUrl}/functions/v1/suno-callback`
    
    const sunoRequestBody = {
      prompt: prompt.trim(),
      customMode,
      instrumental,
      model,
      callbackUrl
    }

    // Add optional fields if provided
    if (customMode) {
      sunoRequestBody.style = style
      sunoRequestBody.title = title
    }

    if (negativeTags) {
      sunoRequestBody.negativeTags = negativeTags
    }

    // Make request to Suno API
    const response = await fetch('https://apibox.erweima.ai/api/v1/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sunoApiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(sunoRequestBody)
    })

    const responseText = await response.text()

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Suno API credits are insufficient. Please contact support.',
          success: false 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      return new Response(JSON.stringify({ 
        error: `Suno API error: ${responseText}`,
        success: false 
      }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

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

    // Check for Suno API success
    if (responseData.code !== 200 || responseData.msg !== 'success') {
      const errorMsg = responseData.error || responseData.message || `API returned code: ${responseData.code}, msg: ${responseData.msg}`
      
      return new Response(JSON.stringify({ 
        error: errorMsg,
        success: false 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const taskId = responseData.data?.taskId
    
    if (!taskId) {
      return new Response(JSON.stringify({ 
        error: 'No task ID received from Suno API',
        success: false 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Deduct credits
    const { error: creditError } = await supabase.rpc('update_user_credits', {
      p_user_id: userId,
      p_amount: -5
    })

    if (creditError) {
      console.error('Failed to deduct credits:', creditError)
    }

    // Create song record with task ID stored in a separate field
    const songData = {
      user_id: userId,
      title: title || 'Generating...',
      type: instrumental ? 'instrumental' : 'song',
      audio_url: taskId, // Temporarily store task ID here
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
      return new Response(JSON.stringify({ 
        error: 'Failed to create song record',
        success: false 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const successResponse = { 
      success: true,
      task_id: taskId,
      song_id: newSong.id,
      message: 'Song generation started successfully. You will be notified when it\'s ready.'
    }

    return new Response(JSON.stringify(successResponse), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Critical error in generation:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal error: ' + error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
