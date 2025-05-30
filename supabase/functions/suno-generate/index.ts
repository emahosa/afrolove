
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

    // Prepare the Suno API request
    const sunoRequestBody = {
      prompt: prompt.trim(),
      customMode,
      instrumental,
      model
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

    // Make request to Suno API with retry logic
    let response
    let lastError
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`🔄 Attempt ${attempt}/3 to Suno API`)
        
        response = await fetch('https://apibox.erweima.ai/api/v1/generate', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sunoApiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(sunoRequestBody)
        })

        if (response.ok) break
        
        const errorText = await response.text()
        lastError = `Status ${response.status}: ${errorText}`
        
        if (response.status === 429) {
          console.log('⏰ Rate limited, waiting before retry...')
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt))
        } else if (response.status >= 500) {
          console.log('🔧 Server error, retrying...')
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
        } else {
          break // Don't retry client errors
        }
      } catch (error) {
        lastError = error.message
        console.log(`❌ Attempt ${attempt} failed:`, error.message)
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
        }
      }
    }

    if (!response || !response.ok) {
      if (response?.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Suno API credits are insufficient. Please contact support.',
          success: false 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      return new Response(JSON.stringify({ 
        error: `Suno API error after 3 attempts: ${lastError}`,
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

    console.log('✅ Got task ID from Suno:', taskId)

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

    // Start background polling for this task
    const backgroundPolling = async () => {
      console.log(`🔄 Starting background polling for task: ${taskId}`)
      
      // Poll every 10 seconds for up to 5 minutes
      for (let i = 0; i < 30; i++) {
        try {
          await new Promise(resolve => setTimeout(resolve, 10000)) // Wait 10 seconds
          
          console.log(`📊 Polling attempt ${i + 1}/30 for task: ${taskId}`)
          
          const { data, error } = await supabase.functions.invoke('suno-status', {
            body: { taskId }
          })
          
          if (data?.updated) {
            console.log(`✅ Task ${taskId} completed via polling!`)
            break
          }
          
          if (data?.failed) {
            console.log(`❌ Task ${taskId} failed via polling`)
            break
          }
          
        } catch (error) {
          console.error(`❌ Polling error for task ${taskId}:`, error)
        }
      }
      
      console.log(`🏁 Finished polling for task: ${taskId}`)
    }

    // Start background task
    EdgeRuntime.waitUntil(backgroundPolling())

    const successResponse = { 
      success: true,
      task_id: taskId,
      song_id: newSong.id,
      message: 'Song generation started successfully. Polling in background for completion.'
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
