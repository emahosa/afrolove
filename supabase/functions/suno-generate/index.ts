
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
      console.error('❌ SUNO_API_KEY not configured')
      return new Response(JSON.stringify({ error: 'SUNO_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body = await req.json()
    
    console.log('🎵 Generating song with request:', JSON.stringify(body, null, 2))

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

    // Validate required fields based on mode
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
      console.error('❌ Error fetching user profile:', profileError)
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

    // Prepare the Suno API request with callback URL
    const callbackUrl = `${supabaseUrl}/functions/v1/suno-webhook`
    
    const sunoRequestBody = {
      prompt: prompt.trim(),
      customMode,
      instrumental,
      model,
      callBackUrl: callbackUrl
    }

    // Add optional fields if provided
    if (customMode) {
      sunoRequestBody.style = style
      sunoRequestBody.title = title
    }

    if (negativeTags) {
      sunoRequestBody.negativeTags = negativeTags
    }

    console.log('🚀 Sending request to Suno with callback:', JSON.stringify(sunoRequestBody, null, 2))

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
    console.log('🔍 Suno API raw response:', responseText)

    if (!response.ok) {
      console.error('❌ Suno API error:', response.status, responseText)
      
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
      console.error('❌ Failed to parse Suno response:', parseError)
      return new Response(JSON.stringify({ 
        error: 'Invalid response from Suno API',
        success: false 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('📊 Parsed Suno response:', JSON.stringify(responseData, null, 2))

    // Check for Suno API success - they use code: 200 and msg: "success"
    if (responseData.code !== 200 || responseData.msg !== 'success') {
      const errorMsg = responseData.error || responseData.message || `API returned code: ${responseData.code}, msg: ${responseData.msg}`
      console.error('❌ Suno API returned error:', errorMsg)
      
      if (errorMsg.includes('Suno API credits are insufficient')) {
        return new Response(JSON.stringify({ 
          error: 'Suno API credits are insufficient. Please contact support.',
          success: false 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      } else if (errorMsg.includes('Insufficient credits')) {
        return new Response(JSON.stringify({ 
          error: 'Insufficient credits. You need at least 5 credits to generate a song.',
          success: false 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      } else if (errorMsg.includes('Prompt too long')) {
        return new Response(JSON.stringify({ 
          error: errorMsg,
          success: false 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      } else {
        return new Response(JSON.stringify({ 
          error: errorMsg,
          success: false 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    const taskId = responseData.data?.taskId
    
    if (!taskId) {
      console.error('❌ No task ID in Suno response')
      return new Response(JSON.stringify({ 
        error: 'No task ID received from Suno API',
        success: false 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('✅ Got task ID from Suno:', taskId)

    // Deduct credits
    const { error: creditError } = await supabase.rpc('update_user_credits', {
      p_user_id: userId,
      p_amount: -5
    })

    if (creditError) {
      console.error('❌ Failed to deduct credits:', creditError)
    } else {
      console.log('💰 Deducted 5 credits from user')
    }

    // Create song record with pending status and task ID stored in audio_url
    const { data: newSong, error: songError } = await supabase
      .from('songs')
      .insert({
        user_id: userId,
        title: title || 'Generating...',
        type: instrumental ? 'instrumental' : 'song',
        audio_url: taskId, // Store task ID here temporarily
        prompt,
        status: 'pending',
        credits_used: 5
      })
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

    console.log('✅ Created song record:', newSong)

    return new Response(JSON.stringify({ 
      success: true,
      task_id: taskId,
      song_id: newSong.id,
      message: 'Song generation started successfully. You will be notified when it completes.'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Generation error:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal error: ' + error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
