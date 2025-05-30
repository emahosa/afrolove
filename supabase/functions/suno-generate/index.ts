
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const sunoApiKey = Deno.env.get('SUNO_API_KEY')
    
    if (!sunoApiKey) {
      console.error('SUNO_API_KEY not configured')
      return new Response(JSON.stringify({ error: 'SUNO_API_KEY not configured' }), {
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Verify auth
    const authorization = req.headers.get('Authorization')
    if (!authorization) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const token = authorization.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      console.error('Auth error:', authError)
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const requestBody = await req.json()
    const { prompt, style, title, instrumental, customMode, model } = requestBody

    if (!prompt?.trim()) {
      return new Response(JSON.stringify({ error: 'Prompt required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check credits
    const { data: profile } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', user.id)
      .single()

    if ((profile?.credits || 0) < 5) {
      return new Response(JSON.stringify({ error: 'Insufficient credits' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Create song record
    const { data: song, error: songError } = await supabase
      .from('songs')
      .insert({
        title: title || 'Generated Song',
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
      console.error('Song creation error:', songError)
      return new Response(JSON.stringify({ error: 'Failed to create song' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Deduct credits
    await supabase
      .from('profiles')
      .update({ credits: (profile?.credits || 0) - 5 })
      .eq('id', user.id)

    // Prepare Suno request with correct callback URL
    const sunoRequest = {
      prompt: prompt.trim(),
      instrumental: instrumental || false,
      model: model || 'V4_5',
      customMode: customMode || false,
      callBackUrl: `${supabaseUrl}/functions/v1/suno-callback`
    }

    // Only add style and title if customMode is true
    if (customMode && style?.trim()) {
      sunoRequest.style = style.trim()
    }
    if (customMode && title?.trim()) {
      sunoRequest.title = title.trim()
    }

    console.log('Sending to Suno API:', JSON.stringify(sunoRequest, null, 2))

    // Call Suno API
    const sunoResponse = await fetch('https://apibox.erweima.ai/api/v1/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sunoApiKey}`
      },
      body: JSON.stringify(sunoRequest)
    })

    const responseText = await sunoResponse.text()
    console.log('Suno API response status:', sunoResponse.status)
    console.log('Suno API response:', responseText)

    if (!sunoResponse.ok) {
      console.error('Suno API error - Status:', sunoResponse.status)
      console.error('Suno API error - Response:', responseText)
      
      // Update song status to rejected
      await supabase
        .from('songs')
        .update({ 
          status: 'rejected',
          audio_url: `suno_error: ${responseText}`
        })
        .eq('id', song.id)
        
      return new Response(JSON.stringify({ error: `Suno API error: ${responseText}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const sunoData = JSON.parse(responseText)
    const taskId = sunoData.data?.taskId || sunoData.taskId

    if (!taskId) {
      console.error('No task ID received from Suno')
      await supabase
        .from('songs')
        .update({ 
          status: 'rejected',
          audio_url: 'error: No task ID received'
        })
        .eq('id', song.id)
        
      return new Response(JSON.stringify({ error: 'No task ID received' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Update with task ID
    await supabase
      .from('songs')
      .update({ 
        audio_url: `task_pending:${taskId}`,
        status: 'pending'
      })
      .eq('id', song.id)

    console.log('✅ Song generation started with task:', taskId)

    return new Response(JSON.stringify({ 
      success: true, 
      song_id: song.id,
      task_id: taskId
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Generation error:', error)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
