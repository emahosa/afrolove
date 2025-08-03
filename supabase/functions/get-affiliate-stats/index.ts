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
    const { data: userRolesData, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (rolesError) {
      return new Response(JSON.stringify({ error: 'Failed to verify user permissions' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
      });
    }

    const userRoles = userRolesData?.map((item) => item.role) || [];
    if (!userRoles.includes('admin') && !userRoles.includes('super_admin')) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    const { count: totalReferred, error: totalReferredError } = await supabaseAdmin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .not('referrer_id', 'is', null);

    const { count: invalidReferrals, error: invalidReferralsError } = await supabaseAdmin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .is('referrer_id', null)
      .not('ip_address', 'is', null);

    // These are simplified queries. A more accurate implementation would require more complex logic.
    const { count: subscribedReferrals, error: subscribedReferralsError } = await supabaseAdmin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .not('referrer_id', 'is', null)
      .in('id', (await supabaseAdmin.from('user_subscriptions').select('user_id').eq('subscription_status', 'active')).data.map(s => s.user_id));


    const stats = {
      totalReferred: totalReferred || 0,
      invalidReferrals: invalidReferrals || 0,
      nonActiveReferrals: 0, // Placeholder
      subscribedReferrals: subscribedReferrals || 0,
      activeFreeReferrals: 0, // Placeholder
    };

    return new Response(JSON.stringify({ stats }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
