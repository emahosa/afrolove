
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
    // Use the hardcoded API key directly instead of environment variable
    const sunoApiKey = "9f290dd97b2bbacfbb9eb199787aea31"
    
    const body = await req.json()
    const { taskId } = body

    console.log('Checking Suno status for task:', taskId)

    // If taskId is 'test', this is just an API key validation request
    if (taskId === 'test') {
      try {
        const testResponse = await fetch('https://apibox.erweima.ai/api/v1/generate', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sunoApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: 'test',
            style: 'Pop',
            title: 'API Key Test',
            instrumental: true,
            customMode: false,
            model: 'V3_5',
            callBackUrl: 'https://bswfiynuvjvoaoyfdrso.supabase.co/functions/v1/suno-callback'
          })
        })

        const testData = await testResponse.json()
        console.log('API key test response:', testData)

        if (testData.code === 429) {
          return new Response(
            JSON.stringify({ 
              error: 'Suno API credits are insufficient',
              success: false,
              code: 429
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200 
            }
          )
        } else if (testData.code === 200) {
          return new Response(
            JSON.stringify({ 
              success: true,
              code: 200,
              msg: 'success',
              message: 'API key is valid'
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200 
            }
          )
        } else {
          return new Response(
            JSON.stringify({ 
              error: `API key validation failed: ${testData.msg || 'Invalid response'}`,
              success: false,
              code: testData.code
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200 
            }
          )
        }
      } catch (testError) {
        console.error('Error testing API key:', testError)
        return new Response(
          JSON.stringify({ 
            error: 'Failed to validate API key',
            success: false
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500 
          }
        )
      }
    }

    // For actual task status checks
    if (!taskId) {
      return new Response(
        JSON.stringify({ 
          error: 'Task ID is required',
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    // Check task status with Suno API
    const statusResponse = await fetch(`https://apibox.erweima.ai/api/v1/query?ids=${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${sunoApiKey}`,
        'Content-Type': 'application/json',
      }
    })

    const statusData = await statusResponse.json()
    console.log('Suno status response:', statusData)

    if (!statusResponse.ok || statusData.code !== 200) {
      return new Response(
        JSON.stringify({ 
          error: `Status check failed: ${statusData.msg || 'Unknown error'}`,
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
        success: true,
        data: statusData.data,
        code: statusData.code,
        msg: statusData.msg
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error in suno-status:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Status check failed',
        success: false
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
