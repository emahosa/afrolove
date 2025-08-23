
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

    // Create RPC functions for affiliate system
    const functions = [
      // Get affiliate links
      `
      CREATE OR REPLACE FUNCTION get_affiliate_links(user_id UUID)
      RETURNS TABLE (
        id UUID,
        affiliate_user_id UUID,
        link_code TEXT,
        clicks_count INTEGER,
        created_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ
      )
      LANGUAGE SQL
      SECURITY DEFINER
      AS $$
        SELECT id, affiliate_user_id, link_code, clicks_count, created_at, updated_at
        FROM affiliate_links
        WHERE affiliate_user_id = user_id;
      $$;
      `,
      
      // Get affiliate wallet
      `
      CREATE OR REPLACE FUNCTION get_affiliate_wallet(user_id UUID)
      RETURNS TABLE (
        id UUID,
        affiliate_user_id UUID,
        balance DECIMAL(10,2),
        total_earned DECIMAL(10,2),
        total_withdrawn DECIMAL(10,2),
        usdt_wallet_address TEXT,
        created_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ
      )
      LANGUAGE SQL
      SECURITY DEFINER
      AS $$
        SELECT id, affiliate_user_id, balance, total_earned, total_withdrawn, usdt_wallet_address, created_at, updated_at
        FROM affiliate_wallets
        WHERE affiliate_user_id = user_id;
      $$;
      `,
      
      // Get affiliate earnings
      `
      CREATE OR REPLACE FUNCTION get_affiliate_earnings(user_id UUID)
      RETURNS TABLE (
        id UUID,
        affiliate_user_id UUID,
        referred_user_id UUID,
        earning_type TEXT,
        amount DECIMAL(10,2),
        status TEXT,
        created_at TIMESTAMPTZ,
        processed_at TIMESTAMPTZ,
        profile JSONB
      )
      LANGUAGE SQL
      SECURITY DEFINER
      AS $$
        SELECT 
          ae.id,
          ae.affiliate_user_id,
          ae.referred_user_id,
          ae.earning_type,
          ae.amount,
          ae.status,
          ae.created_at,
          ae.processed_at,
          jsonb_build_object(
            'full_name', p.full_name,
            'username', p.username
          ) as profile
        FROM affiliate_earnings ae
        LEFT JOIN profiles p ON ae.referred_user_id = p.id
        WHERE ae.affiliate_user_id = user_id
        ORDER BY ae.created_at DESC
        LIMIT 50;
      $$;
      `,
      
      // Check affiliate application status
      `
      CREATE OR REPLACE FUNCTION check_affiliate_application_status(user_id_param UUID)
      RETURNS TABLE (
        status TEXT,
        rejection_date TIMESTAMPTZ
      )
      LANGUAGE SQL
      SECURITY DEFINER
      AS $$
        SELECT status, rejection_date
        FROM affiliate_applications
        WHERE user_id = user_id_param
        ORDER BY created_at DESC
        LIMIT 1;
      $$;
      `
    ];

    // Execute each function
    for (const func of functions) {
      const { error } = await supabaseAdmin.rpc('exec_sql', { sql: func });
      if (error) {
        console.error('Error creating function:', error);
        throw error;
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'RPC functions created successfully' }),
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
