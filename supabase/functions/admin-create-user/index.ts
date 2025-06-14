
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { corsHeaders } from '../_shared/cors.ts';

interface NewUserDetails {
  email: string;
  fullName: string;
  role: string; // UserRole from your types, e.g., "admin", "voter", "subscriber"
  permissions?: string[];
  credits?: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, fullName, role, permissions, credits }: NewUserDetails = await req.json();
    console.log('admin-create-user: Received request:', { email, fullName, role, permissions, credits });

    if (!email || !fullName || !role) {
      return new Response(JSON.stringify({ error: 'Missing required fields: email, fullName, role' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Step 1: Invite the user. This creates an auth.users entry.
    // The handle_new_user trigger will create the public.profiles entry,
    // a default user_roles entry ('voter'), and a default user_subscriptions entry.
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName },
    });

    if (inviteError) {
      console.error('admin-create-user: Error inviting user:', inviteError);
      return new Response(JSON.stringify({ error: `Failed to invite user: ${inviteError.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const newUser = inviteData.user;
    if (!newUser) {
      console.error('admin-create-user: No user data returned from invite');
      return new Response(JSON.stringify({ error: 'Failed to create user: no user data returned from invite' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }
    console.log('admin-create-user: User invited successfully:', newUser.id, newUser.email);

    // Step 2: Update the user's role (overriding the default 'voter' set by trigger)
    // Delete default role if it exists
    const { error: deleteRoleError } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .match({ user_id: newUser.id });

    if (deleteRoleError) {
      console.warn('admin-create-user: Could not delete default role, proceeding:', deleteRoleError.message);
    }

    // Insert the new role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: newUser.id, role: role });

    if (roleError) {
      console.error('admin-create-user: Error setting user role:', roleError);
      // Not returning error here, user is created, admin can fix role later.
      // Potentially log this for manual review.
    } else {
      console.log('admin-create-user: User role set to:', role);
    }

    // Step 3: If role is 'admin' and permissions are provided, insert them
    if (role === 'admin' && permissions && permissions.length > 0) {
      const permissionsToInsert = permissions.map(p => ({ user_id: newUser.id, permission: p }));
      const { error: permissionsError } = await supabaseAdmin
        .from('admin_permissions')
        .insert(permissionsToInsert);

      if (permissionsError) {
        console.error('admin-create-user: Error setting admin permissions:', permissionsError);
      } else {
        console.log('admin-create-user: Admin permissions set.');
      }
    }
    
    // Step 4: Update profile with credits (if provided)
    if (typeof credits === 'number' && credits >= 0) {
        const { error: creditsError } = await supabaseAdmin
            .from('profiles')
            .update({ credits: credits })
            .eq('id', newUser.id);
        if (creditsError) {
            console.error('admin-create-user: Error updating credits:', creditsError);
        } else {
            console.log('admin-create-user: User credits updated to:', credits);
        }
    }


    // Step 5: If role is 'subscriber', update subscription status
    if (role === 'subscriber') {
      const { error: subscriptionError } = await supabaseAdmin
        .from('user_subscriptions')
        .update({ subscription_type: 'premium', subscription_status: 'active', started_at: new Date().toISOString() })
        .eq('user_id', newUser.id);
      
      if (subscriptionError) {
        // If the update fails, it might be because the trigger didn't create the record yet, or another issue.
        // Try to upsert as a fallback.
        const { error: upsertError } = await supabaseAdmin
          .from('user_subscriptions')
          .upsert({ 
            user_id: newUser.id, 
            subscription_type: 'premium', 
            subscription_status: 'active', 
            started_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });

        if (upsertError) {
          console.error('admin-create-user: Error setting subscription status (update/upsert):', upsertError);
        } else {
           console.log('admin-create-user: User subscription set to premium/active via upsert.');
        }
      } else {
        console.log('admin-create-user: User subscription set to premium/active.');
      }
    }

    return new Response(JSON.stringify({ message: 'User created and invited successfully', userId: newUser.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (e) {
    console.error('admin-create-user: Unhandled error:', e);
    return new Response(JSON.stringify({ error: `Internal server error: ${e.message}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
