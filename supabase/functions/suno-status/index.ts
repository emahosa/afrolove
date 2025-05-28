
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const taskId = url.searchParams.get('taskId')

    if (!taskId) {
      throw new Error('Task ID is required')
    }

    const sunoApiKey = Deno.env.get('SUNO_API_KEY')
    if (!sunoApiKey) {
      throw new Error('SUNO_API_KEY not configured')
    }

    console.log('Checking status for task:', taskId)

    const response = await fetch(`https://apibox.erweima.ai/api/v1/generate/record-info?taskId=${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${sunoApiKey}`,
        'Content-Type': 'application/json',
      }
    })

    const data = await response.json()
    console.log('Suno status response:', data)

    return new Response(
      JSON.stringify(data),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: response.ok ? 200 : 400
      }
    )

  } catch (error) {
    console.error('Error checking Suno status:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to check status' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
