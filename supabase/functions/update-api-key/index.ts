
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
    const { keyName, newValue } = await req.json()

    if (!keyName || !newValue) {
      return new Response(
        JSON.stringify({ error: 'Missing keyName or newValue' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Only allow updating the SUNO_API_KEY for security
    if (keyName !== 'SUNO_API_KEY') {
      return new Response(
        JSON.stringify({ error: 'Only SUNO_API_KEY updates are allowed' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Update the environment variable for this function execution
    Deno.env.set(keyName, newValue)
    
    console.log(`Successfully updated ${keyName}`)

    // Test the new API key immediately by making a test call
    try {
      const testResponse = await fetch('https://apibox.erweima.ai/api/v1/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${newValue}`,
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
      
      if (testData.code === 429) {
        return new Response(
          JSON.stringify({ 
            error: 'New API key has insufficient credits',
            success: false
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      } else if (testData.code !== 200) {
        return new Response(
          JSON.stringify({ 
            error: `New API key validation failed: ${testData.msg || 'Invalid key'}`,
            success: false
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Key is valid and has credits
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'API key updated and validated successfully',
          note: 'The new API key is now active and has sufficient credits'
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )

    } catch (testError) {
      console.error('Error testing new API key:', testError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to validate new API key',
          success: false
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error) {
    console.error('Error updating API key:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to update API key' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
