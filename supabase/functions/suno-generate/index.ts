
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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const sunoApiKey = Deno.env.get('SUNO_API_KEY')
    
    if (!sunoApiKey) {
      return new Response(
        JSON.stringify({ error: 'SUNO_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Verify authentication
    const authorization = req.headers.get('Authorization')
    if (!authorization) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authorization.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const requestBody: SunoGenerateRequest = await req.json()
    const { prompt, style, title, instrumental, customMode, model, negativeTags } = requestBody

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
      return new Response(
        JSON.stringify({ error: 'Failed to get user profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userCredits = profile?.credits || 0
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
      return new Response(
        JSON.stringify({ error: 'Failed to create song record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Deduct credits
    await supabase
      .from('profiles')
      .update({ credits: userCredits - 5 })
      .eq('id', user.id)

    // Prepare Suno API request
    const sunoRequest: any = {
      prompt: prompt.trim(),
      instrumental: instrumental || false,
      model: model || 'V4_5',
      callBackUrl: `${supabaseUrl}/functions/v1/suno-callback`
    }

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

    // Make Suno API request with correct endpoint
    const sunoResponse = await fetch('https://apibox.erweima.ai/api/v1/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sunoApiKey}`
      },
      body: JSON.stringify(sunoRequest)
    })

    const responseText = await sunoResponse.text()
    let sunoData: SunoApiResponse

    try {
      sunoData = JSON.parse(responseText)
    } catch (parseError) {
      await supabase
        .from('songs')
        .update({ 
          status: 'rejected',
          audio_url: `parse_error: ${responseText}`
        })
        .eq('id', song.id)
      
      return new Response(
        JSON.stringify({ 
          error: 'Invalid response from Suno API',
          details: responseText
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    if (!sunoResponse.ok) {
      await supabase
        .from('songs')
        .update({ 
          status: 'rejected',
          audio_url: `error_${sunoResponse.status}: ${JSON.stringify(sunoData)}`
        })
        .eq('id', song.id)
      
      return new Response(
        JSON.stringify({ 
          error: `Suno API Error: ${sunoData.msg || 'Unknown error'}`,
          status: sunoResponse.status
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
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
