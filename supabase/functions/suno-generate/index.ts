
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SunoGenerateRequest {
  prompt: string;
  style: string;
  title?: string;
  instrumental: boolean;
  customMode: boolean;
  model: 'V3_5' | 'V4' | 'V4_5';
  negativeTags?: string;
  userId: string;
  requestId?: string;
  isAdminTest?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const sunoApiKey = "9f290dd97b2bbacfbb9eb199787aea31"
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body: SunoGenerateRequest = await req.json()
    console.log('=== SUNO GENERATE REQUEST ===')
    console.log('Full request body:', JSON.stringify(body, null, 2))

    // Validate required fields
    if (!body.prompt || !body.style || !body.userId) {
      console.error('Missing required fields:', { 
        hasPrompt: !!body.prompt, 
        hasStyle: !!body.style, 
        hasUserId: !!body.userId 
      })
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: prompt, style, and userId are required',
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    let userProfile = null;

    // Skip credit validation for admin test generations
    if (!body.isAdminTest) {
      console.log('Checking user profile and credits for user:', body.userId)
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', body.userId)
        .maybeSingle()

      console.log('Profile query result:', { profile, profileError })

      if (profileError) {
        console.error('Profile error:', profileError)
        return new Response(
          JSON.stringify({ 
            error: 'Failed to fetch user profile',
            success: false
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
          }
        )
      }

      if (!profile) {
        console.log('Creating new profile for user:', body.userId)
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: body.userId,
            credits: 5,
            username: null,
            full_name: null,
            avatar_url: null
          })
          .select()
          .single()

        if (createError) {
          console.error('Error creating profile:', createError)
          return new Response(
            JSON.stringify({ 
              error: 'Failed to create user profile',
              success: false
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400 
            }
          )
        }
        userProfile = newProfile
      } else {
        userProfile = profile
      }

      if (userProfile.credits < 5) {
        return new Response(
          JSON.stringify({ 
            error: 'Insufficient credits. You need at least 5 credits to generate a song.',
            success: false
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
          }
        )
      }
    }

    // Prepare callback URL
    const callbackUrl = `${supabaseUrl}/functions/v1/suno-callback`
    console.log('Callback URL:', callbackUrl)

    // Prepare Suno API request
    const sunoPayload = {
      prompt: body.prompt,
      style: body.style,
      title: body.title || '',
      instrumental: body.instrumental,
      customMode: body.customMode,
      model: body.model,
      callBackUrl: callbackUrl,
      ...(body.negativeTags && { negativeTags: body.negativeTags })
    }

    console.log('Sending request to Suno API with payload:', JSON.stringify(sunoPayload, null, 2))

    // Call Suno API
    const sunoResponse = await fetch('https://apibox.erweima.ai/api/v1/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sunoApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sunoPayload)
    })

    const sunoData = await sunoResponse.json()
    console.log('Suno API response status:', sunoResponse.status)
    console.log('Suno API response data:', JSON.stringify(sunoData, null, 2))

    if (!sunoResponse.ok || sunoData.code !== 200) {
      console.error('Suno API error - Status:', sunoResponse.status, 'Data:', sunoData)
      
      if (sunoData.code === 429) {
        return new Response(
          JSON.stringify({ 
            error: 'Suno API credits are insufficient. Please check your Suno account and top up credits.',
            success: false
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
          }
        )
      }
      
      return new Response(
        JSON.stringify({ 
          error: `Suno API error: ${sunoData.msg || 'Unknown error'}`,
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    const taskId = sunoData.data?.task_id || sunoData.data?.taskId
    if (!taskId) {
      console.error('No task ID received from Suno API')
      return new Response(
        JSON.stringify({ 
          error: 'No task ID received from Suno API',
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    console.log('✅ Received task ID from Suno:', taskId)

    // Store generation task in database
    if (body.requestId) {
      console.log('=== CUSTOM SONG REQUEST PATH ===')
      console.log('Creating custom song audio record for request:', body.requestId)
      
      const { data: insertedAudio, error: insertError } = await supabase
        .from('custom_song_audio')
        .insert({
          request_id: body.requestId,
          audio_url: `task_pending:${taskId}`,
          version: 1,
          is_selected: true,
          created_by: body.userId
        })
        .select()
        .single()

      if (insertError) {
        console.error('Error storing custom song task info:', insertError)
        return new Response(
          JSON.stringify({ 
            error: 'Failed to store custom song task info',
            success: false
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500 
          }
        )
      } else {
        console.log('✅ Created custom song audio record:', insertedAudio.id)
      }
    } else {
      console.log('=== GENERAL SONG GENERATION PATH ===')
      
      const pendingAudioUrl = `task_pending:${taskId}`
      
      const songData = {
        title: body.title || 'Generating...',
        audio_url: pendingAudioUrl,
        lyrics: body.prompt,
        type: body.instrumental ? 'instrumental' : 'song',
        user_id: body.userId,
        status: 'pending',
        credits_used: body.isAdminTest ? 0 : 5,
        prompt: body.prompt
      }

      console.log('Inserting song data:', JSON.stringify(songData, null, 2))

      const { data: insertedSong, error: insertError } = await supabase
        .from('songs')
        .insert(songData)
        .select()
        .single()

      if (insertError) {
        console.error('Error storing pending song:', insertError)
        return new Response(
          JSON.stringify({ 
            error: 'Failed to create song record in database',
            success: false,
            details: insertError
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500 
          }
        )
      } else {
        console.log('✅ Created pending song record:', insertedSong.id)
        console.log('✅ Song stored with audio_url:', insertedSong.audio_url)
      }
    }

    // Deduct credits for non-admin test generations
    if (!body.isAdminTest && userProfile) {
      console.log('Deducting credits from user:', body.userId)
      
      const { error: creditError } = await supabase
        .from('profiles')
        .update({ credits: userProfile.credits - 5 })
        .eq('id', body.userId)

      if (creditError) {
        console.error('Error deducting credits:', creditError)
      } else {
        console.log('✅ Deducted 5 credits from user:', body.userId)
      }

      // Log credit transaction
      const { error: transactionError } = await supabase
        .from('credit_transactions')
        .insert({
          user_id: body.userId,
          amount: -5,
          transaction_type: 'debit',
          description: `Song generation: ${body.title || 'Untitled'}`
        })
      
      if (transactionError) {
        console.error('Error logging credit transaction:', transactionError)
      }
    }

    console.log('=== SUNO GENERATE SUCCESS ===')

    return new Response(
      JSON.stringify({
        success: true,
        task_id: taskId,
        message: 'Song generation started successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('=== SUNO GENERATE ERROR ===')
    console.error('Error details:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to generate song',
        success: false
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
