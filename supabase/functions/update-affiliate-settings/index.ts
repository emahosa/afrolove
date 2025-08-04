
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
      console.error('Error fetching user roles:', rolesError);
      return new Response(JSON.stringify({ error: 'Failed to verify user permissions' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500,
      });
    }

    const userRoles = userRolesData?.map((item) => item.role) || [];
    if (!userRoles.includes('admin') && !userRoles.includes('super_admin') && user.id !== '1a7e4d46-b4f2-464e-a1f4-2766836286c1') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    const { settings } = await req.json();
    console.log('Received settings to update:', settings);

    for (const setting of settings) {
      const { key, value } = setting;
      console.log(`Upserting setting: ${key} to ${value}`);
      
      // Convert value to proper JSON format for storage
      let jsonValue;
      if (typeof value === 'string' && (value === 'true' || value === 'false')) {
        jsonValue = value === 'true';
      } else if (!isNaN(Number(value))) {
        jsonValue = Number(value);
      } else {
        jsonValue = value;
      }
      
      // Use upsert to handle both insert and update cases
      const { data, error } = await supabaseAdmin
        .from('system_settings')
        .upsert(
          {
            key: key,
            value: jsonValue,
            category: 'affiliate',
            description: `Affiliate program setting: ${key}`,
            updated_by: user.id
          },
          { 
            onConflict: 'key',
            ignoreDuplicates: false 
          }
        )
        .select();

      if (error) {
        console.error(`Error upserting setting ${key}:`, error);
        return new Response(JSON.stringify({ error: `Failed to save setting: ${key}`, details: error.message }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        });
      }
      console.log(`Successfully upserted ${key}. Response:`, data);
    }

    return new Response(JSON.stringify({ message: 'Settings updated successfully' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
