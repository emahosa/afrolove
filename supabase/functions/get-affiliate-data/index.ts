
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const getSupabaseAdmin = () => {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const userSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user }, error: userError } = await userSupabaseClient.auth.getUser()

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { type, userId } = await req.json();

    switch (type) {
      case 'links':
        const { data: links } = await supabaseAdmin
          .from('affiliate_links')
          .select('*')
          .eq('affiliate_user_id', userId);
        
        return new Response(JSON.stringify({ links: links || [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })

      case 'wallet':
        const { data: wallet } = await supabaseAdmin
          .from('affiliate_wallets')
          .select('*')
          .eq('affiliate_user_id', userId)
          .single();
        
        return new Response(JSON.stringify({ wallet }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })

      case 'earnings':
        const { data: earnings } = await supabaseAdmin
          .from('affiliate_earnings')
          .select(`
            *,
            profiles!referred_user_id(full_name, username)
          `)
          .eq('affiliate_user_id', userId)
          .order('created_at', { ascending: false });
        
        return new Response(JSON.stringify({ earnings: earnings || [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })

      case 'analytics':
        // Get comprehensive analytics
        const [
          { data: totalReferrals },
          { data: validReferrals },
          { data: invalidReferrals },
          { data: subscribedReferrals },
          { data: activeFreeReferrals }
        ] = await Promise.all([
          supabaseAdmin
            .from('affiliate_earnings')
            .select('id', { count: 'exact', head: true })
            .eq('affiliate_user_id', userId),
          supabaseAdmin
            .from('affiliate_earnings')
            .select('id', { count: 'exact', head: true })
            .eq('affiliate_user_id', userId)
            .eq('is_valid', true),
          supabaseAdmin
            .from('affiliate_earnings')
            .select('id', { count: 'exact', head: true })
            .eq('affiliate_user_id', userId)
            .eq('is_valid', false),
          supabaseAdmin
            .from('affiliate_earnings')
            .select('id', { count: 'exact', head: true })
            .eq('affiliate_user_id', userId)
            .eq('earning_type', 'subscription_commission')
            .eq('is_valid', true),
          supabaseAdmin
            .from('affiliate_earnings')
            .select('id', { count: 'exact', head: true })
            .eq('affiliate_user_id', userId)
            .eq('earning_type', 'free_referral')
            .eq('is_valid', true)
        ]);

        const analytics = {
          totalReferrals: totalReferrals?.count || 0,
          validReferrals: validReferrals?.count || 0,
          invalidReferrals: invalidReferrals?.count || 0,
          subscribedReferrals: subscribedReferrals?.count || 0,
          activeFreeReferrals: activeFreeReferrals?.count || 0
        };

        return new Response(JSON.stringify({ analytics }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })

      default:
        return new Response(JSON.stringify({ error: 'Invalid type' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        })
    }

  } catch (error) {
    console.error('Unhandled error:', error.message)
    return new Response(JSON.stringify({ error: 'An unexpected error occurred' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
