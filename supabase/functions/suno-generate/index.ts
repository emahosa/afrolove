
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
    // Use the hardcoded API key directly
    const sunoApiKey = "9f290dd97b2bbacfbb9eb199787aea31"

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body: SunoGenerateRequest = await req.json()
    console.log('Suno generate request:', { ...body, userId: body.userId })

    let userProfile = null;

    // Skip credit validation for admin test generations
    if (!body.isAdminTest) {
      // Validate user has sufficient credits
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', body.userId)
        .single()

      if (profileError) {
        console.error('Profile error:', profileError)
        // If profile doesn't exist, create it
        if (profileError.code === 'PGRST116') {
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
          return new Response(
            JSON.stringify({ 
              error: 'User profile not found',
              success: false
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400 
            }
          )
        }
      } else {
        userProfile = profile
      }

      if (userProfile.credits < 5) { // Assuming 5 credits per generation
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

    // Validate prompt length based on mode and model
    const maxLength = body.model === 'V4_5' ? 5000 : 3000
    const promptModeMaxLength = 400

    if (!body.customMode && body.prompt.length > promptModeMaxLength) {
      return new Response(
        JSON.stringify({ 
          error: `Prompt mode is limited to ${promptModeMaxLength} characters`,
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    if (body.customMode && body.prompt.length > maxLength) {
      return new Response(
        JSON.stringify({ 
          error: `Lyric input mode for ${body.model} is limited to ${maxLength} characters`,
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    // Prepare callback URL
    const callbackUrl = `${supabaseUrl}/functions/v1/suno-callback`

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

    console.log('Sending request to Suno API:', { ...sunoPayload, callBackUrl: callbackUrl })

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
    console.log('Suno API response:', sunoData)

    if (!sunoResponse.ok || sunoData.code !== 200) {
      // Handle specific Suno API errors
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

    console.log('Received task ID from Suno:', taskId)

    // Store generation task in database for callback linking
    if (body.requestId) {
      // This is for a custom song request
      console.log('Creating custom song audio record for request:', body.requestId)
      const { error: insertError } = await supabase
        .from('custom_song_audio')
        .insert({
          request_id: body.requestId,
          audio_url: `task_pending:${taskId}`,
          version: 1,
          is_selected: true,
          created_by: body.userId
        })

      if (insertError) {
        console.error('Error storing custom song task info:', insertError)
      } else {
        console.log('Successfully created custom song audio record for task:', taskId)
      }
    } else {
      // This is a general Suno generation - create a pending song record
      console.log('Creating pending song record for task:', taskId)
      const songData = {
        title: body.title || 'Generating...',
        audio_url: `task_pending:${taskId}`,
        lyrics: body.prompt,
        type: body.instrumental ? 'instrumental' : 'song',
        user_id: body.userId,
        status: 'pending',
        credits_used: body.isAdminTest ? 0 : 5,
        prompt: body.prompt
      }

      console.log('Inserting song with data:', songData)

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
        console.log('Successfully created pending song record:', insertedSong.id, 'for task:', taskId)
      }
    }

    // Only deduct credits for non-admin test generations
    if (!body.isAdminTest && userProfile) {
      // Deduct credits from user
      const { error: creditError } = await supabase
        .from('profiles')
        .update({ credits: userProfile.credits - 5 })
        .eq('id', body.userId)

      if (creditError) {
        console.error('Error deducting credits:', creditError)
        // Continue anyway as the generation has started
      } else {
        console.log('Successfully deducted 5 credits from user:', body.userId)
      }

      // Log credit transaction
      await supabase
        .from('credit_transactions')
        .insert({
          user_id: body.userId,
          amount: -5,
          transaction_type: 'debit',
          description: `Song generation: ${body.title || 'Untitled'}`
        })
    }

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
    console.error('Error in suno-generate:', error)
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
