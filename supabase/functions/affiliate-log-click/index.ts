import { serve } from "https://deno.land/std/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';

interface AffiliateClickPayload {
  code: string;
  landing_url: string;
  referrer_url?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { code, landing_url, referrer_url }: AffiliateClickPayload = await req.json();

    if (!code) {
      return new Response(JSON.stringify({ error: 'Affiliate code is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const { data: aff, error: affError } = await supabaseAdmin
      .from('affiliates')
      .select('id')
      .eq('code', code)
      .single();

    if (affError || !aff) {
      // Still return a 200 OK response to not leak information about valid codes
      console.warn(`Invalid affiliate code received: ${code}`);
      return new Response(JSON.stringify({ message: 'Invalid code' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const { error: insertError } = await supabaseAdmin.from('affiliate_clicks').insert({
      affiliate_id: aff.id,
      landing_url,
      referrer_url,
    });

    if (insertError) {
      console.error('Error logging affiliate click:', insertError);
      throw insertError;
    }

    return new Response(JSON.stringify({ message: 'ok' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Unhandled error in affiliate-log-click:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error', details: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
