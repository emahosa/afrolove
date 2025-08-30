import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

console.log("`test-cors` function script started.");

serve(async (req) => {
  console.log("`test-cors` function invoked with method:", req.method);

  if (req.method === 'OPTIONS') {
    console.log("Responding to OPTIONS request in `test-cors`");
    return new Response('ok', { headers: corsHeaders })
  }

  console.log("Responding to non-OPTIONS request in `test-cors`");
  return new Response(JSON.stringify({ message: 'Hello from test-cors!' }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  })
})
