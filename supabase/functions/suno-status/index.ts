
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SunoStatusResponse {
  code: number;
  msg: string;
  data?: {
    task_id: string;
    status: 'PENDING' | 'TEXT_SUCCESS' | 'FIRST_SUCCESS' | 'SUCCESS' | 'FAIL';
    audio_url?: string;
    stream_audio_url?: string;
    image_url?: string;
    title?: string;
    duration?: number;
    model_name?: string;
    prompt?: string;
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const sunoApiKey = Deno.env.get('SUNO_API_KEY')
    
    if (!sunoApiKey || sunoApiKey.length < 10) {
      return new Response(
        JSON.stringify({ error: 'SUNO_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { taskId } = await req.json()

    if (!taskId) {
      return new Response(
        JSON.stringify({ error: 'taskId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Checking status for task:', taskId)

    // Check if this is a test request
    if (taskId === 'test') {
      // Return a test response to validate API key
      const testResponse = await fetch('https://apibox.erweima.ai/api/v1/generate/credit', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${sunoApiKey}`
        }
      })

      if (testResponse.ok) {
        const creditData = await testResponse.json()
        console.log('API key test successful, credits:', creditData)
        
        if (creditData.data <= 0) {
          return new Response(
            JSON.stringify({ 
              error: 'Suno API credits are insufficient',
              credits: creditData.data
            }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        return new Response(
          JSON.stringify({ 
            code: 200, 
            msg: 'success', 
            credits: creditData.data 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } else {
        const errorText = await testResponse.text()
        console.error('API key test failed:', testResponse.status, errorText)
        return new Response(
          JSON.stringify({ 
            error: 'API key validation failed',
            status: testResponse.status,
            details: errorText
          }),
          { status: testResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Check actual task status
    const statusResponse = await fetch(`https://apibox.erweima.ai/api/v1/generate/record-info?taskId=${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${sunoApiKey}`
      }
    })

    const statusText = await statusResponse.text()
    console.log('Status response:', statusResponse.status, statusText)

    if (!statusResponse.ok) {
      return new Response(
        JSON.stringify({ 
          error: 'Failed to check status',
          status: statusResponse.status,
          details: statusText
        }),
        { status: statusResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let statusData: SunoStatusResponse
    try {
      statusData = JSON.parse(statusText)
    } catch (error) {
      console.error('Failed to parse status response:', error)
      return new Response(
        JSON.stringify({ 
          error: 'Invalid response from Suno API',
          details: statusText
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify(statusData),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in suno-status:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
