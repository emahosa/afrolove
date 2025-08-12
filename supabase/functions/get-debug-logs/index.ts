import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Temporarily removed auth for debugging purposes.

    // Fetch debug data
    const [clicks, referrals, earnings] = await Promise.all([
      supabaseAdmin.from('affiliate_clicks').select('*').order('created_at', { ascending: false }).limit(10),
      supabaseAdmin.from('affiliate_referrals').select('*').order('created_at', { ascending: false }).limit(10),
      supabaseAdmin.from('affiliate_earnings').select('*').order('created_at', { ascending: false }).limit(10)
    ]);

    const debugData = {
      clicks: clicks.data,
      referrals: referrals.data,
      earnings: earnings.data,
      errors: {
        clicks: clicks.error,
        referrals: referrals.error,
        earnings: earnings.error,
      }
    };

    return new Response(JSON.stringify(debugData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in get-debug-logs:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
