import { SupabaseClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors.ts';

interface ReviewRequest {
  application_id: string;
  new_status: 'approved' | 'rejected';
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Create a Supabase client with the user's auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const userSupabaseClient = new SupabaseClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // The RPC function itself checks for admin role, which is more secure.

    // 2. Parse request body
    const { application_id, new_status }: ReviewRequest = await req.json();
    if (!application_id || !new_status) {
      return new Response(JSON.stringify({ error: 'Missing application_id or new_status' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
    if (new_status !== 'approved' && new_status !== 'rejected') {
        return new Response(JSON.stringify({ error: 'Invalid status. Must be "approved" or "rejected".' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // 3. Call the RPC function
    const { error: rpcError } = await userSupabaseClient.rpc('handle_review_producer_application', {
      p_application_id: application_id,
      p_new_status: new_status,
    });

    if (rpcError) {
      console.error('Error calling RPC handle_review_producer_application:', rpcError);
      return new Response(JSON.stringify({ error: rpcError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400, // Use a 400-level error since the RPC likely failed due to a business logic violation (e.g., not admin, wrong status).
      });
    }

    // 4. Return success
    return new Response(JSON.stringify({ message: `Application ${new_status} successfully.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (e) {
    console.error('Unhandled error in review-producer-application:', e);
    return new Response(JSON.stringify({ error: `Internal server error: ${e.message}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
