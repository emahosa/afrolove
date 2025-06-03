
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
  console.log(`Handling API error - Code: ${code}, Message: ${msg}`);
  
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
  return apiKey.length >= 20 && apiKey.length <= 50 && !/\s/.test(apiKey);
};

serve(async (req) => {
  console.log(`${new Date().toISOString()} - Request received: ${req.method}`);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { apiKey } = await req.json()
    
    console.log('API key validation request received');
    console.log('API key length:', apiKey?.length);
    
    if (!apiKey || typeof apiKey !== 'string') {
      console.error('Invalid API key input - missing or not string');
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
      console.error('Invalid API key format');
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
        model: 'V3_5',
        callBackUrl: 'https://bswfiynuvjvoaoyfdrso.supabase.co/functions/v1/suno-webhook'
      })
    })

    console.log('API response status:', testResponse.status);

    if (!testResponse.ok) {
      console.error('API request failed with status:', testResponse.status);
      
      if (testResponse.status === 401) {
        return new Response(
          JSON.stringify({ 
            error: 'API key is invalid or expired',
            success: false
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 // Return 200 so the frontend can handle the error gracefully
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
          status: 200 // Return 200 so the frontend can handle the error gracefully
        }
      )
    }

    const testData: ApiResponse = await testResponse.json()
    console.log('API validation response:', testData)

    // Handle API response using the error handling function
    const result = handleApiError(testData.code, testData.msg || 'Unknown response')

    console.log('Validation result:', result);

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
          status: 200 // Return 200 so the frontend can handle the error gracefully
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
          status: 200 
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
        status: 200 
      }
    )
  }
})
