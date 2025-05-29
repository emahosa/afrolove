
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
    // Set the new API key directly
    const newApiKey = "9f290dd97b2bbacfbb9eb199787aea31"
    
    // Test the API key first
    console.log('Testing Suno API key...')
    
    const testResponse = await fetch('https://apibox.erweima.ai/api/v1/generate', {
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
        model: 'V3_5',
        callBackUrl: 'https://bswfiynuvjvoaoyfdrso.supabase.co/functions/v1/suno-callback'
      })
    })

    const testData = await testResponse.json()
    console.log('API key test response:', testData)

    if (testData.code === 200 || testData.code === 429) {
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
    console.error('Error updating API key:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to update API key',
        success: false
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
