
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const audioUrl = url.searchParams.get('url')

    if (!audioUrl) {
      return new Response(JSON.stringify({ error: 'Audio URL is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`🎵 Proxying audio from: ${audioUrl}`)

    const audioResponse = await fetch(audioUrl, {
      headers: { 'Accept': 'audio/*' }
    })

    if (!audioResponse.ok) {
      console.error(`❌ Failed to fetch audio from source: ${audioResponse.status} ${audioResponse.statusText}`)
      return new Response(audioResponse.body, {
        status: audioResponse.status,
        headers: { ...corsHeaders },
      })
    }
    
    const responseHeaders = new Headers(corsHeaders)
    const contentType = audioResponse.headers.get('Content-Type')
    const contentLength = audioResponse.headers.get('Content-Length')

    if (contentType) responseHeaders.set('Content-Type', contentType)
    if (contentLength) responseHeaders.set('Content-Length', contentLength)
    
    responseHeaders.set('Accept-Ranges', 'bytes')
    
    console.log('✅ Streaming audio with headers:', Object.fromEntries(responseHeaders.entries()));
    
    return new Response(audioResponse.body, {
      status: 200,
      headers: responseHeaders,
    })

  } catch (error) {
    console.error('❌ CRITICAL PROXY ERROR:', error.message)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

