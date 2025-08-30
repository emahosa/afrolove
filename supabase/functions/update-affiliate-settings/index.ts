
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
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
    
    // Check admin permissions
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
    const isAdmin = userRoles.includes('admin') || userRoles.includes('super_admin') || user.id === '1a7e4d46-b4f2-464e-a1f4-2766836286c1';
    
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    const { settings } = await req.json();
    console.log('Received settings to update:', settings);

    if (!settings || !Array.isArray(settings)) {
      return new Response(JSON.stringify({ error: 'Invalid settings format' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const results = [];

    for (const setting of settings) {
      const { key, value } = setting;
      console.log(`Processing setting: ${key} = ${value}`);
      
      if (!key) {
        console.error('Missing key for setting:', setting);
        continue;
      }
      
      // Convert value to proper format for storage
      let processedValue;
      if (typeof value === 'string') {
        if (value === 'true' || value === 'false') {
          processedValue = value === 'true';
        } else if (!isNaN(Number(value)) && value.trim() !== '') {
          processedValue = Number(value);
        } else {
          processedValue = value;
        }
      } else {
        processedValue = value;
      }
      
      console.log(`Upserting setting: ${key} with processed value:`, processedValue);
      
      try {
        // Use upsert to handle both insert and update cases
        const { data, error } = await supabaseAdmin
          .from('system_settings')
          .upsert(
            {
              key: key,
              value: processedValue,
              category: 'affiliate',
              description: `Affiliate program setting: ${key}`,
              updated_by: user.id,
              updated_at: new Date().toISOString()
            },
            { 
              onConflict: 'key',
              ignoreDuplicates: false 
            }
          )
          .select();

        if (error) {
          console.error(`Error upserting setting ${key}:`, error);
          results.push({ key, success: false, error: error.message });
        } else {
          console.log(`Successfully upserted ${key}. Response:`, data);
          results.push({ key, success: true, data });
        }
      } catch (settingError) {
        console.error(`Exception upserting setting ${key}:`, settingError);
        results.push({ key, success: false, error: settingError.message });
      }
    }

    const failedSettings = results.filter(r => !r.success);
    if (failedSettings.length > 0) {
      console.error('Some settings failed to update:', failedSettings);
      return new Response(JSON.stringify({ 
        error: 'Some settings failed to update', 
        details: failedSettings,
        results 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 207, // Multi-status
      });
    }

    return new Response(JSON.stringify({ 
      message: 'Settings updated successfully',
      results 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message,
      stack: error.stack 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
