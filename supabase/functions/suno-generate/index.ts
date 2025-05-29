
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { corsHeaders } from '../_shared/cors.ts'

interface SunoGenerateRequest {
  prompt: string
  make_instrumental: boolean
  wait_audio: boolean
  model_version?: string
  title?: string
  tags?: string
}

interface SunoResponse {
  id: string
  title: string
  status: string
  audio_url?: string
  video_url?: string
  image_url?: string
  lyric?: string
  model_name?: string
  gpt_description_prompt?: string
  prompt?: string
  type?: string
  tags?: string
  duration?: number
  error_type?: string
  error_message?: string
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Get the Authorization header
    const authorization = req.headers.get('Authorization')
    if (!authorization) {
      console.error('No authorization header provided')
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user from token
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authorization.replace('Bearer ', '')
    )

    if (authError || !user) {
      console.error('Auth error:', authError)
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const requestBody = await req.json()
    console.log('Suno Generate: Request received for user:', user.id, 'Body:', requestBody)

    const { prompt, type, genre_id, title } = requestBody

    if (!prompt) {
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
      console.error('Error fetching user profile:', profileError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user has enough credits (assuming 1 credit per song)
    if (profile.credits < 1) {
      return new Response(
        JSON.stringify({ error: 'Insufficient credits' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get Suno API key
    const { data: apiConfig, error: apiError } = await supabase
      .from('api_configs')
      .select('api_key_encrypted')
      .eq('service', 'suno')
      .eq('is_enabled', true)
      .single()

    if (apiError || !apiConfig?.api_key_encrypted) {
      console.error('Suno API key not found:', apiError)
      return new Response(
        JSON.stringify({ error: 'Suno API not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create song record first with pending status
    const { data: song, error: songError } = await supabase
      .from('songs')
      .insert({
        title: title || 'Generated Song',
        type: type || 'song',
        user_id: user.id,
        genre_id: genre_id || null,
        prompt: prompt,
        status: 'pending',
        audio_url: 'task_pending:generating',
        credits_used: 1
      })
      .select()
      .single()

    if (songError) {
      console.error('Error creating song record:', songError)
      return new Response(
        JSON.stringify({ error: 'Failed to create song record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Song record created:', song.id)

    // Deduct credits
    const { error: creditError } = await supabase.rpc('update_user_credits', {
      p_user_id: user.id,
      p_amount: -1
    })

    if (creditError) {
      console.error('Error updating credits:', creditError)
      // Don't fail the request, but log the error
    }

    // Prepare Suno API request
    const sunoRequest: SunoGenerateRequest = {
      prompt: prompt,
      make_instrumental: type === 'instrumental',
      wait_audio: false, // Don't wait for audio, use callback
      model_version: 'chirp-v3-5',
      title: title || 'Generated Song',
      tags: type === 'instrumental' ? 'instrumental' : undefined
    }

    // Call Suno API
    try {
      const sunoResponse = await fetch('https://api.sunoaiapi.com/api/v1/gateway/generate/music', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiConfig.api_key_encrypted
        },
        body: JSON.stringify(sunoRequest)
      })

      if (!sunoResponse.ok) {
        const errorText = await sunoResponse.text()
        console.error('Suno API error:', sunoResponse.status, errorText)
        
        // Update song with error status
        await supabase
          .from('songs')
          .update({ 
            status: 'rejected',
            audio_url: `error: Suno API failed - ${sunoResponse.status}`
          })
          .eq('id', song.id)
        
        return new Response(
          JSON.stringify({ error: 'Suno API request failed' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const sunoData = await sunoResponse.json()
      console.log('Suno API response:', sunoData)

      // Update song with Suno task ID
      if (sunoData.data && sunoData.data.length > 0) {
        const taskId = sunoData.data[0].id || sunoData.data[0].task_id
        
        await supabase
          .from('songs')
          .update({ 
            audio_url: `task_pending:${taskId}`,
            status: 'pending'
          })
          .eq('id', song.id)

        console.log('Song updated with task ID:', taskId)
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            song_id: song.id,
            task_id: taskId,
            message: 'Song generation started'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } else {
        console.error('Invalid Suno API response structure:', sunoData)
        
        await supabase
          .from('songs')
          .update({ 
            status: 'rejected',
            audio_url: 'error: Invalid API response'
          })
          .eq('id', song.id)
        
        return new Response(
          JSON.stringify({ error: 'Invalid response from Suno API' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

    } catch (error) {
      console.error('Error calling Suno API:', error)
      
      // Update song with error status
      await supabase
        .from('songs')
        .update({ 
          status: 'rejected',
          audio_url: `error: ${error.message}`
        })
        .eq('id', song.id)
      
      return new Response(
        JSON.stringify({ error: 'Failed to communicate with Suno API' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('General error in suno-generate:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
