
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  console.log('🚀 CREATE AFFILIATE FUNCTION STARTED')
  console.log('📋 Request method:', req.method)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body = await req.json()
    
    const { userId, fullName, email } = body

    console.log('📥 Creating affiliate for user:', { userId, fullName, email })

    if (!userId || !fullName || !email) {
      console.error('❌ Missing required fields')
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: userId, fullName, email',
        success: false 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Generate affiliate code
    const { data: affiliateCode, error: codeError } = await supabase.rpc(
      'generate_affiliate_code',
      { p_full_name: fullName }
    )

    if (codeError) {
      console.error('❌ Error generating affiliate code:', codeError)
      throw codeError
    }

    console.log('✅ Generated affiliate code:', affiliateCode)

    // Create referral link
    const appBaseUrl = Deno.env.get('APP_BASE_URL') || 'https://afroverse.lovable.app'
    const referralLink = `${appBaseUrl}/?ref=${affiliateCode}`

    // Create affiliate record
    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliates')
      .insert({
        user_id: userId,
        affiliate_code: affiliateCode,
        referral_link: referralLink,
        total_earnings: 0,
        pending_withdrawals: 0,
        total_withdrawals: 0,
        is_active: true
      })
      .select()
      .single()

    if (affiliateError) {
      console.error('❌ Error creating affiliate:', affiliateError)
      throw affiliateError
    }

    console.log('✅ Affiliate created:', affiliate.id)

    // Add affiliate role to user
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role: 'affiliate'
      })

    if (roleError) {
      console.error('❌ Error adding affiliate role:', roleError)
      // Don't throw error here as affiliate is already created
    }

    console.log('✅ Affiliate role added')
    console.log('🎉 AFFILIATE CREATION COMPLETED SUCCESSFULLY')

    return new Response(JSON.stringify({ 
      success: true,
      affiliate_id: affiliate.id,
      affiliate_code: affiliateCode,
      referral_link: referralLink,
      message: 'Affiliate created successfully'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('💥 CRITICAL ERROR in create-affiliate function:', error)
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
