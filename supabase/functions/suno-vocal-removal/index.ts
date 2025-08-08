
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
      return new Response(
        JSON.stringify({ error: 'SUNO_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const { taskId, audioId } = await req.json()

    if (!taskId || !audioId) {
      return new Response(
        JSON.stringify({ error: 'taskId and audioId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const vocalRemovalRequest = {
      taskId: taskId,
      audioId: audioId,
      callBackUrl: `${supabaseUrl}/functions/v1/suno-vocal-callback`
    }

    console.log('Removing vocals with request:', vocalRemovalRequest)

    const response = await fetch('https://api.api.box/api/v1/vocal-removal/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sunoApiKey}`
      },
      body: JSON.stringify(vocalRemovalRequest)
    })

    const responseText = await response.text()
    console.log('Vocal removal response:', response.status, responseText)

    if (!response.ok) {
      return new Response(
        JSON.stringify({ 
          error: 'Failed to remove vocals',
          status: response.status,
          details: responseText
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = JSON.parse(responseText)
    return new Response(
      JSON.stringify(data),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in suno-vocal-removal:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
