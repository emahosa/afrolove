
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { type, userId } = await req.json();

    let data = {};

    switch (type) {
      case 'links':
        const { data: links, error: linksError } = await supabaseAdmin
          .from('affiliate_links')
          .select('*')
          .eq('affiliate_user_id', userId);

        if (linksError) {
          console.error('Error fetching affiliate links:', linksError);
        } else {
          data = { links: links || [] };
        }
        break;

      case 'wallet':
        const { data: wallet, error: walletError } = await supabaseAdmin
          .from('affiliate_wallets')
          .select('*')
          .eq('affiliate_user_id', userId)
          .single();

        if (walletError && walletError.code !== 'PGRST116') {
          console.error('Error fetching wallet:', walletError);
        } else {
          data = { wallet: wallet || null };
        }
        break;

      case 'earnings':
        const { data: earnings, error: earningsError } = await supabaseAdmin
          .from('affiliate_earnings')
          .select(`
            *,
            profile:referred_user_id (
              full_name,
              username
            )
          `)
          .eq('affiliate_user_id', userId)
          .order('created_at', { ascending: false })
          .limit(50);

        if (earningsError) {
          console.error('Error fetching earnings:', earningsError);
        } else {
          data = { earnings: earnings || [] };
        }
        break;

      default:
        throw new Error('Invalid data type requested');
    }

    return new Response(
      JSON.stringify(data),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
