
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  console.log('🚀 TRACK REFERRAL FUNCTION STARTED')
  console.log('📋 Request method:', req.method)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body = await req.json()
    
    const { userId, referralCode } = body

    console.log('📥 Tracking referral:', { userId, referralCode })

    if (!userId || !referralCode) {
      console.error('❌ Missing required fields')
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: userId, referralCode',
        success: false 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Find the affiliate by code
    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliates')
      .select('id')
      .eq('affiliate_code', referralCode)
      .eq('is_active', true)
      .single()

    if (affiliateError || !affiliate) {
      console.error('❌ Affiliate not found:', referralCode)
      return new Response(JSON.stringify({ 
        error: 'Invalid referral code',
        success: false 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('✅ Found affiliate:', affiliate.id)

    // Check if referral already exists
    const { data: existingReferral } = await supabase
      .from('referrals')
      .select('id')
      .eq('referred_user_id', userId)
      .single()

    if (existingReferral) {
      console.log('ℹ️ Referral already exists for user:', userId)
      return new Response(JSON.stringify({ 
        success: true,
        message: 'Referral already tracked'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Create referral record
    const { data: referral, error: referralError } = await supabase
      .from('referrals')
      .insert({
        referrer_id: affiliate.id,
        referred_user_id: userId,
        referral_code: referralCode,
        is_converted: false
      })
      .select()
      .single()

    if (referralError) {
      console.error('❌ Error creating referral:', referralError)
      throw referralError
    }

    console.log('✅ Referral created:', referral.id)

    // Update user profile with referrer_id
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ referrer_id: affiliate.id })
      .eq('id', userId)

    if (profileError) {
      console.error('❌ Error updating profile with referrer:', profileError)
      // Don't throw error as referral is already created
    }

    console.log('✅ Profile updated with referrer')
    console.log('🎉 REFERRAL TRACKING COMPLETED SUCCESSFULLY')

    return new Response(JSON.stringify({ 
      success: true,
      referral_id: referral.id,
      message: 'Referral tracked successfully'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('💥 CRITICAL ERROR in track-referral function:', error)
    console.error('💥 Error stack:', error.stack)
    
    return new Response(JSON.stringify({ 
      error: 'Internal server error: ' + error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
