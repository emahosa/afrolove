import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { corsHeaders } from '../_shared/cors.ts';

interface NewUserDetails {
  email: string;
  fullName: string;
  role: string; // UserRole from your types, e.g., "admin", "voter", "subscriber"
  password?: string; // Optional password
  permissions?: string[];
  credits?: number;
  appBaseUrl?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, fullName, role, password, permissions, credits, appBaseUrl }: NewUserDetails = await req.json();
    console.log('admin-create-user: Received request:', { email, fullName, role, permissions, credits, appBaseUrl, passwordProvided: !!password });

    if (!email || !fullName || !role) {
      return new Response(JSON.stringify({ error: 'Missing required fields: email, fullName, role' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    let newUser;
    let userCreationMethodMessage: string;

    if (password && (role === 'admin' || role === 'super_admin')) {
      // Create user directly with password
      console.log('admin-create-user: Attempting to create user directly with password.');
      const { data: createUserData, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // User must confirm their email
        user_metadata: { full_name: fullName }, // Store full_name in user_metadata, accessible via auth.user
        // app_metadata: { role: role } // Could store role here too, but we handle it via user_roles table
      });

      if (createUserError) {
        console.error('admin-create-user: Error creating user directly:', createUserError);
        return new Response(JSON.stringify({ error: `Failed to create user: ${createUserError.message}` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        });
      }
      newUser = createUserData.user;
      userCreationMethodMessage = 'User account created directly. They will receive an email to confirm their address. Please provide them with their initial password.';
      console.log('admin-create-user: User created directly:', newUser?.id, newUser?.email);
    } else {
      // Invite user by email (existing flow)
      console.log('admin-create-user: Attempting to invite user by email.');
      let redirectTo;
      if (appBaseUrl) {
        redirectTo = `${appBaseUrl}/login`;
        console.log('admin-create-user: Redirect URL set to:', redirectTo);
      }

      const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: { full_name: fullName }, // This data is included in the invitation email template context
        redirectTo: redirectTo,
      });

      if (inviteError) {
        console.error('admin-create-user: Error inviting user:', inviteError);
        return new Response(JSON.stringify({ error: `Failed to invite user: ${inviteError.message}` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        });
      }
      newUser = inviteData.user;
      userCreationMethodMessage = 'User invited successfully. They will receive an email to set up their account and will be redirected to login after setting their password.';
      console.log('admin-create-user: User invited successfully:', newUser?.id, newUser?.email);
    }

    if (!newUser) {
      console.error('admin-create-user: No user data returned from creation/invite step');
      return new Response(JSON.stringify({ error: 'Failed to create/invite user: no user data returned' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }
    
    // The handle_new_user trigger should have created a profile and default user_roles entry.
    // If createUser was used, the trigger also fires based on auth.users insertion.

    // Step 2: Update the user's role (overriding the default 'voter' set by trigger if necessary)
    const { error: deleteRoleError } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .match({ user_id: newUser.id });

    if (deleteRoleError) {
      console.warn('admin-create-user: Could not delete default role, proceeding:', deleteRoleError.message);
    }

    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: newUser.id, role: role });

    if (roleError) {
      console.error('admin-create-user: Error setting user role:', roleError);
    } else {
      console.log('admin-create-user: User role set to:', role);
    }

    // Step 3: If role is 'admin' and permissions are provided, insert them
    if ((role === 'admin' || role === 'super_admin') && permissions && permissions.length > 0) {
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
    // Ensure profile exists, handle_new_user trigger should create it.
    // If createUser was used, user_metadata.full_name was set. The trigger might try to create profile too.
    // Let's ensure the full_name is consistent on the profile.
    const profileUpdateData: { credits?: number, full_name?: string } = {};
    if (typeof credits === 'number' && credits >= 0) {
        profileUpdateData.credits = credits;
    }
    // If user was created directly, ensure full_name is on profile table too, not just auth.users.user_metadata
    // The handle_new_user trigger should take care of copying full_name from user_metadata if profile is new.
    // If profile already existed (e.g. re-invite), we might want to update it.
    // For now, let's assume trigger handles initial profile.full_name based on auth.user.
    // If password was set, fullName was in user_metadata. If invited, it was in data for invite.
    // We can also update full_name on profiles table directly to be safe
    profileUpdateData.full_name = fullName;


    if (Object.keys(profileUpdateData).length > 0) {
        const { error: profileUpdateError } = await supabaseAdmin
            .from('profiles')
            .update(profileUpdateData)
            .eq('id', newUser.id);

        if (profileUpdateError) {
            console.error('admin-create-user: Error updating profile with credits/name:', profileUpdateError);
        } else {
            console.log('admin-create-user: User profile updated with credits/name:', profileUpdateData);
        }
    }
    
    // Step 5: If role is 'subscriber', update subscription status
    // ... keep existing code (subscriber logic)
    if (role === 'subscriber') {
      const { error: subscriptionError } = await supabaseAdmin
        .from('user_subscriptions')
        .update({ subscription_type: 'premium', subscription_status: 'active', started_at: new Date().toISOString() })
        .eq('user_id', newUser.id);
      
      if (subscriptionError) {
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

    return new Response(JSON.stringify({ message: userCreationMethodMessage, userId: newUser.id }), {
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
