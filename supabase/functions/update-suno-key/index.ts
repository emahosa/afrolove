
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ApiResponse {
  code: number;
  msg?: string;
  data?: any;
}

const handleApiError = (code: number, msg: string): { isValid: boolean; message: string; hasCredits: boolean } => {
  switch (code) {
    case 200:
      return {
        isValid: true,
        message: 'API key is valid and ready to use',
        hasCredits: true
      };
    case 401:
      return {
        isValid: false,
        message: 'Authentication failed: Invalid or expired API key',
        hasCredits: false
      };
    case 429:
      return {
        isValid: true,
        message: 'API key is valid but account has insufficient credits',
        hasCredits: false
      };
    case 405:
      return {
        isValid: false,
        message: 'Rate limited: Please reduce request frequency',
        hasCredits: false
      };
    default:
      return {
        isValid: false,
        message: `API error: ${msg || 'Unknown error'}`,
        hasCredits: false
      };
  }
};

const validateApiKeyFormat = (apiKey: string): boolean => {
  // Basic validation: should be 20-50 characters, no spaces
  return apiKey.length >= 20 && apiKey.length <= 50 && !/\s/.test(apiKey);
};

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

    // Validate API key format
    if (!validateApiKeyFormat(apiKey)) {
      return new Response(
        JSON.stringify({ 
          error: 'API key format appears invalid (expected 20-50 characters with no spaces)',
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    console.log('Testing Suno API key validity with proper error handling...')
    
    // Test the API key with a minimal request including required callBackUrl
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
        model: 'V3_5',
        callBackUrl: 'https://bswfiynuvjvoaoyfdrso.supabase.co/functions/v1/suno-webhook'
      })
    })

    if (!testResponse.ok) {
      console.error('API request failed with status:', testResponse.status)
      
      if (testResponse.status === 401) {
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
      }
      
      return new Response(
        JSON.stringify({ 
          error: `HTTP error: ${testResponse.status}`,
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: testResponse.status 
        }
      )
    }

    const testData: ApiResponse = await testResponse.json()
    console.log('API validation response:', testData)

    // Handle API response using the error handling function
    const result = handleApiError(testData.code, testData.msg || 'Unknown response')

    if (result.isValid) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: result.message,
          key: apiKey,
          hasCredits: result.hasCredits
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    } else {
      return new Response(
        JSON.stringify({ 
          error: result.message,
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

  } catch (error) {
    console.error('Critical error validating API key:', error)
    
    // Handle network errors and timeouts
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return new Response(
        JSON.stringify({ 
          error: 'Network error: Unable to connect to Suno API. Please check your connection and try again.',
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 503 
        }
      )
    }
    
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
