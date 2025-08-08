
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
    const { referralCode, userAgent, ipAddress } = await req.json();

    if (!referralCode) {
      return new Response(JSON.stringify({ error: 'Referral code is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Find the affiliate link
    const { data: linkData, error: linkError } = await supabaseAdmin
      .from('affiliate_links')
      .select('*')
      .eq('link_code', referralCode)
      .single();

    if (linkError || !linkData) {
      return new Response(JSON.stringify({ error: 'Invalid referral code' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    // Update click count
    const { error: updateError } = await supabaseAdmin
      .from('affiliate_links')
      .update({ 
        clicks_count: linkData.clicks_count + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', linkData.id);

    if (updateError) {
      console.error('Error updating click count:', updateError);
    }

    // Store the referral code in session/local storage for later use during registration
    return new Response(JSON.stringify({ 
      success: true, 
      affiliateId: linkData.affiliate_user_id,
      message: 'Click tracked successfully' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error tracking referral click:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})
