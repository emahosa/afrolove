
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
    const { apiKey } = await req.json()
    
    if (!apiKey || typeof apiKey !== 'string') {
      return new Response(
        JSON.stringify({ 
          error: 'API key is required and must be a string',
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    // Validate API key format (basic check)
    if (apiKey.length < 20 || apiKey.length > 50) {
      return new Response(
        JSON.stringify({ 
          error: 'API key format appears invalid (expected 20-50 characters)',
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    console.log('Testing Suno API key validity...')
    
    // Test the API key with a minimal request
    const testResponse = await fetch('https://apibox.erweima.ai/api/v1/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: 'validation test',
        customMode: false,
        instrumental: true,
        model: 'V3_5'
      })
    })

    const testData = await testResponse.json()
    console.log('API validation response:', testData)

    // Check if the response indicates the key is valid
    if (testData.code === 200 || testData.code === 429) {
      // Code 200 = success, Code 429 = rate limit/insufficient credits (but key is valid)
      return new Response(
        JSON.stringify({ 
          success: true,
          message: testData.code === 200 
            ? 'API key is valid and ready to use' 
            : 'API key is valid but account needs more credits',
          key: apiKey,
          hasCredits: testData.code === 200
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    } else if (testResponse.status === 401) {
      return new Response(
        JSON.stringify({ 
          error: 'API key is invalid or expired',
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      )
    } else {
      return new Response(
        JSON.stringify({ 
          error: `API validation failed: ${testData.msg || 'Unknown error'}`,
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

  } catch (error) {
    console.error('Error validating API key:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to validate API key',
        success: false
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
