
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
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

    // Get Suno API key first to fail fast if not configured
    console.log('Checking for Suno API key configuration...')
    const { data: apiConfig, error: apiError } = await supabase
      .from('api_configs')
      .select('api_key_encrypted')
      .eq('service', 'suno')
      .eq('is_enabled', true)
      .maybeSingle()

    if (apiError) {
      console.error('Error fetching Suno API config:', apiError)
      return new Response(
        JSON.stringify({ error: 'Database error while checking API configuration' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!apiConfig || !apiConfig.api_key_encrypted) {
      console.error('Suno API key not configured')
      return new Response(
        JSON.stringify({ 
          error: 'Suno API not configured', 
          details: 'Please contact the administrator to configure the Suno API key' 
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Suno API key found, proceeding with user profile check...')

    // Check user profile and credits
    let profile;
    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      console.error('Error fetching user profile:', profileError)
      return new Response(
        JSON.stringify({ error: 'Error checking user profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!existingProfile) {
      console.log('Creating profile for user:', user.id)
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          full_name: user.user_metadata?.name || user.user_metadata?.full_name || 'User',
          username: user.email || '',
          avatar_url: user.user_metadata?.avatar_url || '',
          credits: 5
        })
        .select('credits')
        .single()

      if (createError) {
        console.error('Error creating profile:', createError)
        return new Response(
          JSON.stringify({ error: 'Failed to create user profile' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      profile = newProfile
    } else {
      profile = existingProfile
    }

    // Check if user has enough credits (5 credits per song)
    if (profile.credits < 5) {
      return new Response(
        JSON.stringify({ 
          error: 'Insufficient credits', 
          details: 'You need at least 5 credits to generate a song. Please purchase more credits.',
          required: 5,
          available: profile.credits
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    // Deduct credits using service role
    const { error: creditError } = await supabase
      .from('profiles')
      .update({ credits: profile.credits - 5 })
      .eq('id', user.id)

    if (creditError) {
      console.error('Error updating credits:', creditError)
      // Don't fail the request, but log the error
    }

    // Log credit transaction
    await supabase
      .from('credit_transactions')
      .insert({
        user_id: user.id,
        amount: -5,
        transaction_type: 'usage',
        description: 'Credits used for song generation'
      })

    // Prepare Suno API request
    const sunoRequest = {
      prompt: prompt,
      make_instrumental: instrumental || false,
      wait_audio: false,
      model_version: 'chirp-v3-5',
      title: songTitle,
      tags: style || (instrumental ? 'instrumental' : undefined)
    }

    console.log('Calling Suno API with request:', sunoRequest)

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

      const responseText = await sunoResponse.text()
      console.log('Suno API response status:', sunoResponse.status)
      console.log('Suno API response body:', responseText)

      if (!sunoResponse.ok) {
        console.error('Suno API error:', sunoResponse.status, responseText)
        
        // Update song with error status
        await supabase
          .from('songs')
          .update({ 
            status: 'rejected',
            audio_url: `error: Suno API failed - ${sunoResponse.status}: ${responseText}`
          })
          .eq('id', song.id)
        
        // Check for specific error types
        if (responseText.includes('insufficient') || responseText.includes('credits')) {
          return new Response(
            JSON.stringify({ 
              error: 'Suno API credits exhausted', 
              details: 'The Suno AI service has run out of credits. Please contact the administrator.' 
            }),
            { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        return new Response(
          JSON.stringify({ 
            error: 'Suno API request failed', 
            details: `API returned status ${sunoResponse.status}: ${responseText}` 
          }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      let sunoData;
      try {
        sunoData = JSON.parse(responseText)
      } catch (parseError) {
        console.error('Failed to parse Suno API response:', parseError)
        
        await supabase
          .from('songs')
          .update({ 
            status: 'rejected',
            audio_url: 'error: Invalid API response format'
          })
          .eq('id', song.id)
        
        return new Response(
          JSON.stringify({ error: 'Invalid response format from Suno API' }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('Parsed Suno API response:', sunoData)

      // Update song with Suno task ID
      if (sunoData.data && sunoData.data.length > 0) {
        const taskId = sunoData.data[0].id || sunoData.data[0].task_id
        
        if (!taskId) {
          console.error('No task ID found in Suno response:', sunoData)
          
          await supabase
            .from('songs')
            .update({ 
              status: 'rejected',
              audio_url: 'error: No task ID received'
            })
            .eq('id', song.id)
          
          return new Response(
            JSON.stringify({ error: 'No task ID received from Suno API' }),
            { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
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
            audio_url: 'error: Invalid API response structure'
          })
          .eq('id', song.id)
        
        return new Response(
          JSON.stringify({ error: 'Invalid response structure from Suno API' }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        JSON.stringify({ 
          error: 'Failed to communicate with Suno API', 
          details: error.message 
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('General error in suno-generate:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
