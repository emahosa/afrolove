
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Use the provided API key
    const newApiKey = "7fc761e1476332e37664a3ef9be8b50c"
    
    console.log('Testing Suno API key...')
    
    // Test the new API key by making a test call
    const testResponse = await fetch('https://api.sunoaiapi.com/api/v1/gateway/generate/music', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${newApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: 'test',
        style: 'Pop',
        title: 'API Key Test',
        instrumental: true,
        customMode: false,
        model: 'V3_5'
      })
    })

    const testData = await testResponse.json()
    console.log('API key test response:', testData)
    
    if (testResponse.ok || testData.code === 200) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'API key is valid and ready to use',
          key: newApiKey
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
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

  } catch (error) {
    console.error('Error testing API key:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to test API key',
        success: false
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
