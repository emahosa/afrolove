import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Function to initialize Supabase admin client
const getSupabaseAdmin = (): SupabaseClient => {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )
}

interface UserRole {
  role: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Authenticate the request (Admin only)
    const userSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user: callingUser }, error: userError } = await userSupabaseClient.auth.getUser();

    if (userError || !callingUser) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401,
      });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data: userRolesData, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', callingUser.id);

    if (rolesError) {
      console.error('Error fetching calling user roles:', rolesError.message);
      return new Response(JSON.stringify({ error: 'Failed to verify user permissions' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
      });
    }

    const callingUserRoles = userRolesData?.map((item: UserRole) => item.role) || [];
    const knownSuperAdminEmail = Deno.env.get('SUPER_ADMIN_EMAIL');
    const isSuperAdminByEmail = knownSuperAdminEmail && callingUser.email === knownSuperAdminEmail;
    const canPerformAction = isSuperAdminByEmail || callingUserRoles.includes('super_admin') || callingUserRoles.includes('admin');

    if (!canPerformAction) {
      return new Response(JSON.stringify({ error: 'Forbidden: You do not have permission to perform this action.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403,
      });
    }

    // 2. Validate user_id from request body
    const body = await req.json();
    const targetUserId = body?.user_id;

    if (!targetUserId || typeof targetUserId !== 'string') {
      return new Response(JSON.stringify({ error: 'target_user_id (string) is required in the request body' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      });
    }

    // 3. Check user_subscriptions table for an active subscription
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('subscription_status, expires_at')
      .eq('user_id', targetUserId)
      .single();

    if (subError) {
      console.error(`Error fetching subscription for user ${targetUserId}:`, subError.message);
      return new Response(JSON.stringify({ error: `Failed to fetch subscription details for user ${targetUserId}. Detail: ${subError.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
      });
    }

    if (!subscription) {
      return new Response(JSON.stringify({ error: `No subscription record found for user ${targetUserId}.` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404,
      });
    }

    const isActive = subscription.subscription_status === 'active' &&
                     (!subscription.expires_at || new Date(subscription.expires_at) > new Date());

    if (!isActive) {
      return new Response(JSON.stringify({
        message: `User ${targetUserId} does not have an active subscription. Status: ${subscription.subscription_status}, Expires: ${subscription.expires_at}. No role change made.`,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
      });
    }

    // 4. If active, add 'subscriber' role if not already present
    const { data: existingRole, error: checkRoleError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id, role')
      .eq('user_id', targetUserId)
      .eq('role', 'subscriber')
      .maybeSingle();

    if (checkRoleError) {
      console.error(`Error checking existing subscriber role for user ${targetUserId}:`, checkRoleError.message);
      return new Response(JSON.stringify({ error: 'Failed to check existing roles.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
      });
    }

    if (!existingRole) {
      const { error: addRoleError } = await supabaseAdmin
        .from('user_roles')
        .insert({ user_id: targetUserId, role: 'subscriber' });

      if (addRoleError) {
        console.error(`Failed to add 'subscriber' role for user ${targetUserId}:`, addRoleError.message);
        return new Response(JSON.stringify({ error: `Failed to add subscriber role. Detail: ${addRoleError.message}` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
        });
      }
      console.log(`Successfully added 'subscriber' role to user ${targetUserId}.`);
      return new Response(JSON.stringify({ message: `Successfully added 'subscriber' role to user ${targetUserId}.` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
      });
    } else {
      console.log(`User ${targetUserId} already has 'subscriber' role.`);
      return new Response(JSON.stringify({ message: `User ${targetUserId} already has 'subscriber' role. No change made.` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
      });
    }

  } catch (error) {
    console.error('Unhandled error in sync-subscription-role:', error);
    // Check if error is a SyntaxError from req.json() due to empty body for GET etc.
    if (error instanceof SyntaxError && req.method !== 'POST' && req.method !== 'PUT' && req.method !== 'PATCH') {
        return new Response(JSON.stringify({ error: 'Invalid request: Body is not expected for this method or is malformed.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
        });
    }
    return new Response(JSON.stringify({ error: 'An unexpected error occurred.', details: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    });
  }
})
