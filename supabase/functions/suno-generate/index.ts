
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { corsHeaders } from '../_shared/cors.ts'

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

    const { prompt, type, genre_id, title, instrumental, style } = requestBody

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use admin client to check user credits (bypasses RLS)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching user profile:', profileError)
      
      // Try to create profile if it doesn't exist
      const { error: createError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          full_name: user.user_metadata?.name || 'User',
          username: user.email || '',
          avatar_url: user.user_metadata?.avatar_url || '',
          credits: 5
        })

      if (createError) {
        console.error('Error creating profile:', createError)
        return new Response(
          JSON.stringify({ error: 'Failed to access user profile' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Retry fetching after creation
      const { data: newProfile, error: retryError } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', user.id)
        .single()

      if (retryError || !newProfile) {
        return new Response(
          JSON.stringify({ error: 'Failed to fetch user profile after creation' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      profile = newProfile
    }

    // Check if user has enough credits (5 credits per song)
    if (profile.credits < 5) {
      return new Response(
        JSON.stringify({ error: 'Insufficient credits. You need at least 5 credits to generate a song.' }),
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
        JSON.stringify({ error: 'Suno API not configured. Please contact administrator.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create song record first with pending status
    const songTitle = title || `Generated ${style || 'Song'}`
    const { data: song, error: songError } = await supabase
      .from('songs')
      .insert({
        title: songTitle,
        type: instrumental ? 'instrumental' : 'song',
        user_id: user.id,
        genre_id: genre_id || null,
        prompt: prompt,
        status: 'pending',
        audio_url: 'task_pending:generating',
        credits_used: 5
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
      p_amount: -5
    })

    if (creditError) {
      console.error('Error updating credits:', creditError)
      // Don't fail the request, but log the error
    }

    // Prepare Suno API request
    const sunoRequest = {
      prompt: prompt,
      make_instrumental: instrumental || false,
      wait_audio: false,
      model_version: 'chirp-v3-5',
      title: songTitle,
      tags: style || (instrumental ? 'instrumental' : undefined)
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
          JSON.stringify({ error: 'Suno API request failed. Please try again later.' }),
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
            message: 'Song generation started successfully'
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
