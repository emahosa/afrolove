
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface ActivityPayload {
  activity_type: 'signup' | 'subscription_page_visit' | 'subscription_completed';
  referrer_code?: string;
  metadata?: any;
}

const getSupabaseAdmin = () => {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
}

const isValidReferral = async (supabaseAdmin: any, userId: string, referrerUserId: string) => {
  // Get user's registration details
  const { data: user } = await supabaseAdmin
    .from('profiles')
    .select('registration_ip, device_id')
    .eq('id', userId)
    .single();

  if (!user || !user.registration_ip || !user.device_id) {
    return { isValid: false, reason: 'Missing registration details' };
  }

  // Check for duplicate IP addresses
  const { data: duplicateIPs } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('registration_ip', user.registration_ip)
    .neq('id', userId);

  if (duplicateIPs && duplicateIPs.length > 0) {
    return { isValid: false, reason: 'Duplicate IP address' };
  }

  // Check for duplicate device IDs
  const { data: duplicateDevices } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('device_id', user.device_id)
    .neq('id', userId);

  if (duplicateDevices && duplicateDevices.length > 0) {
    return { isValid: false, reason: 'Duplicate device ID' };
  }

  return { isValid: true, reason: null };
};

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
      console.error('Auth error:', userError?.message || 'No user found');
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const supabaseAdmin = getSupabaseAdmin();
    const payload: ActivityPayload = await req.json();

    // Check if affiliate program is enabled
    const { data: programSettings } = await supabaseAdmin
      .from('system_settings')
      .select('value')
      .eq('key', 'affiliate_program_enabled')
      .single();

    if (!programSettings || programSettings.value !== 'true') {
      return new Response(JSON.stringify({ message: 'Affiliate program is disabled' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    let referrerAffiliateId = null;

    // Find referrer if code is provided
    if (payload.referrer_code) {
      const { data: linkData, error: linkError } = await supabaseAdmin
        .from('affiliate_links')
        .select('affiliate_user_id')
        .eq('link_code', payload.referrer_code)
        .single();

      if (!linkError && linkData) {
        referrerAffiliateId = linkData.affiliate_user_id;
        
        // Increment click count
        await supabaseAdmin
          .from('affiliate_links')
          .update({ 
            clicks_count: supabaseAdmin.sql`clicks_count + 1`,
            updated_at: new Date().toISOString()
          })
          .eq('link_code', payload.referrer_code);
      }
    }

    // Insert activity
    const { error: activityError } = await supabaseAdmin
      .from('user_activities')
      .insert({
        user_id: user.id,
        activity_type: payload.activity_type,
        referrer_affiliate_id: referrerAffiliateId,
        metadata: payload.metadata
      });

    if (activityError) {
      console.error('Error inserting activity:', activityError.message);
      return new Response(JSON.stringify({ error: 'Failed to track activity' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    // Handle earning logic for subscription page visit (free referral)
    if (payload.activity_type === 'subscription_page_visit' && referrerAffiliateId) {
      // Check if free referral program is enabled
      const { data: freeReferralSettings } = await supabaseAdmin
        .from('system_settings')
        .select('value')
        .eq('key', 'affiliate_free_referral_enabled')
        .single();

      if (freeReferralSettings?.value === 'true') {
        // Check if user signed up within 14 days and hasn't already earned free referral
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

        const { data: signupActivity } = await supabaseAdmin
          .from('user_activities')
          .select('created_at')
          .eq('user_id', user.id)
          .eq('activity_type', 'signup')
          .gte('created_at', fourteenDaysAgo.toISOString())
          .single();

        if (signupActivity) {
          // Validate referral
          const validation = await isValidReferral(supabaseAdmin, user.id, referrerAffiliateId);
          
          // Check if free referral already exists
          const { data: existingEarning } = await supabaseAdmin
            .from('affiliate_earnings')
            .select('id')
            .eq('affiliate_user_id', referrerAffiliateId)
            .eq('referred_user_id', user.id)
            .eq('earning_type', 'free_referral')
            .single();

          if (!existingEarning) {
            // Get compensation amount from settings
            const { data: settings } = await supabaseAdmin
              .from('system_settings')
              .select('value')
              .eq('key', 'affiliate_free_referral_compensation')
              .single();

            const compensationAmount = settings ? parseFloat(settings.value) : 0.10;

            // Add free referral earning
            await supabaseAdmin
              .from('affiliate_earnings')
              .insert({
                affiliate_user_id: referrerAffiliateId,
                referred_user_id: user.id,
                earning_type: 'free_referral',
                amount: compensationAmount,
                status: 'pending',
                is_valid: validation.isValid,
                invalid_reason: validation.reason
              });

            // Update affiliate wallet if valid
            if (validation.isValid) {
              await supabaseAdmin
                .from('affiliate_wallets')
                .upsert({
                  affiliate_user_id: referrerAffiliateId,
                  balance: supabaseAdmin.sql`COALESCE(balance, 0) + ${compensationAmount}`,
                  total_earned: supabaseAdmin.sql`COALESCE(total_earned, 0) + ${compensationAmount}`,
                  updated_at: new Date().toISOString()
                }, { onConflict: 'affiliate_user_id' });
            }
          }
        }
      }
    }

    // Handle subscription commission
    if (payload.activity_type === 'subscription_completed' && referrerAffiliateId && payload.metadata?.subscription_amount) {
      // Check if subscription commission is enabled
      const { data: commissionSettings } = await supabaseAdmin
        .from('system_settings')
        .select('value')
        .eq('key', 'affiliate_subscription_commission_enabled')
        .single();

      if (commissionSettings?.value === 'true') {
        // Check if signup was within 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: signupActivity } = await supabaseAdmin
          .from('user_activities')
          .select('created_at')
          .eq('user_id', user.id)
          .eq('activity_type', 'signup')
          .gte('created_at', thirtyDaysAgo.toISOString())
          .single();

        if (signupActivity) {
          // Validate referral
          const validation = await isValidReferral(supabaseAdmin, user.id, referrerAffiliateId);
          
          const { data: settings } = await supabaseAdmin
            .from('system_settings')
            .select('value')
            .eq('key', 'affiliate_subscription_commission_percent')
            .single();

          const commissionPercent = settings ? parseFloat(settings.value) : 10;
          const commissionAmount = (payload.metadata.subscription_amount * commissionPercent) / 100;

          await supabaseAdmin
            .from('affiliate_earnings')
            .insert({
              affiliate_user_id: referrerAffiliateId,
              referred_user_id: user.id,
              earning_type: 'subscription_commission',
              amount: commissionAmount,
              status: 'pending',
              is_valid: validation.isValid,
              invalid_reason: validation.reason
            });

          // Update affiliate wallet if valid
          if (validation.isValid) {
            await supabaseAdmin
              .from('affiliate_wallets')
              .upsert({
                affiliate_user_id: referrerAffiliateId,
                balance: supabaseAdmin.sql`COALESCE(balance, 0) + ${commissionAmount}`,
                total_earned: supabaseAdmin.sql`COALESCE(total_earned, 0) + ${commissionAmount}`,
                updated_at: new Date().toISOString()
              }, { onConflict: 'affiliate_user_id' });
          }
        }
      }
    }

    return new Response(JSON.stringify({ message: 'Activity tracked successfully' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Unhandled error:', error.message)
    return new Response(JSON.stringify({ error: 'An unexpected error occurred' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
