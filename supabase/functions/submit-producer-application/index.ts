import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { corsHeaders } from '../_shared/cors.ts';

interface ProducerApplicationRequest {
  social_media_links: Record<string, string>;
  id_document_url: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Get the user from the Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Authentication failed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // 2. Parse the request body
    const { social_media_links, id_document_url }: ProducerApplicationRequest = await req.json();
    if (!social_media_links || !id_document_url) {
      return new Response(JSON.stringify({ error: 'Missing required fields: social_media_links, id_document_url' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // 3. Check for existing application for this user
    const { data: existingApplication, error: existingCheckError } = await supabaseAdmin
      .from('producer_applications')
      .select('status')
      .eq('user_id', user.id)
      .in('status', ['pending', 'approved'])
      .single();

    if (existingCheckError && existingCheckError.code !== 'PGRST116') { // Ignore 'No rows found' error
      throw existingCheckError;
    }

    if (existingApplication) {
      return new Response(JSON.stringify({ error: `You already have an application with status: ${existingApplication.status}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 409, // Conflict
      });
    }

    // 4. Insert the new application into the database
    const { error: insertError } = await supabaseAdmin
      .from('producer_applications')
      .insert({
        user_id: user.id,
        social_media_links,
        id_document_url,
        status: 'pending',
      });

    if (insertError) {
      console.error('Error inserting producer application:', insertError);
      throw insertError;
    }

    // 5. Return success response
    return new Response(JSON.stringify({ message: 'Application submitted successfully' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201, // Created
    });

  } catch (e) {
    console.error('Unhandled error in submit-producer-application:', e);
    return new Response(JSON.stringify({ error: `Internal server error: ${e.message}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
