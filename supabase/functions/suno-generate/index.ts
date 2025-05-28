
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
  isAdminTest?: boolean; // Add flag for admin testing
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const sunoApiKey = Deno.env.get('SUNO_API_KEY')
    if (!sunoApiKey) {
      throw new Error('SUNO_API_KEY not configured')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body: SunoGenerateRequest = await req.json()
    console.log('Suno generate request:', { ...body, userId: body.userId })

    // Skip credit validation for admin test generations
    if (!body.isAdminTest) {
      // Validate user has sufficient credits
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', body.userId)
        .single()

      if (profileError || !profile) {
        throw new Error('User profile not found')
      }

      if (profile.credits < 5) { // Assuming 5 credits per generation
        throw new Error('Insufficient credits. You need at least 5 credits to generate a song.')
      }
    }

    // Validate prompt length based on mode and model
    const maxLength = body.model === 'V4_5' ? 5000 : 3000
    const promptModeMaxLength = 400

    if (!body.customMode && body.prompt.length > promptModeMaxLength) {
      throw new Error(`Prompt mode is limited to ${promptModeMaxLength} characters`)
    }

    if (body.customMode && body.prompt.length > maxLength) {
      throw new Error(`Lyric input mode for ${body.model} is limited to ${maxLength} characters`)
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

    if (!sunoResponse.ok) {
      throw new Error(`Suno API error: ${sunoData.msg || 'Unknown error'}`)
    }

    // Fix: Check for both task_id and taskId (the API returns taskId in camelCase)
    const taskId = sunoData.data?.task_id || sunoData.data?.taskId
    if (!taskId) {
      throw new Error('No task ID received from Suno API')
    }

    // Only deduct credits for non-admin test generations
    if (!body.isAdminTest) {
      // Deduct credits from user
      const { error: creditError } = await supabase
        .from('profiles')
        .update({ credits: profile.credits - 5 })
        .eq('id', body.userId)

      if (creditError) {
        console.error('Error deducting credits:', creditError)
        // Continue anyway as the generation has started
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

    // Store generation task in database if this is for a custom song request
    if (body.requestId) {
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
        console.error('Error storing task info:', insertError)
      }
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
        status: 400 
      }
    )
  }
})
