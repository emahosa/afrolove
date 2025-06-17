import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
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

interface AffiliateApplication {
  id: string;
  user_id: string;
  full_name: string;
  status: string;
  // other fields
}

// Helper to generate a unique referral code
async function generateUniqueReferralCode(supabaseAdmin: SupabaseClient, baseName: string): Promise<string> {
  let code = baseName.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/gi, '');
  if (code.length > 10) { // Keep it reasonably short
    code = code.substring(0, 10);
  }
  if (code.length < 3 && baseName.length >=3) { // Ensure some minimum length if possible
      code = baseName.toLowerCase().substring(0,3) + Math.random().toString(36).substring(2, 5);
  } else if (code.length < 3) {
      code = 'ref' + Math.random().toString(36).substring(2, 7);
  }


  let uniqueCode = `${code}${Math.random().toString(36).substring(2, 6)}`; // e.g., johnsmiab1c2d
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const { data, error } = await supabaseAdmin
      .from('affiliate_applications')
      .select('id')
      .eq('unique_referral_code', uniqueCode)
      .maybeSingle();

    if (error) throw new Error(`Database error checking referral code uniqueness: ${error.message}`);
    if (!data) return uniqueCode; // Code is unique

    // Collision, try a new one
    console.warn(`Referral code collision for ${uniqueCode}. Attempt ${attempts + 1}`);
    uniqueCode = `${code}${Math.random().toString(36).substring(2, 7)}`; // Add more randomness
    attempts++;
  }
  throw new Error('Failed to generate a unique referral code after several attempts.');
}


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const userSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: userError } = await userSupabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401,
      });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data: userRolesData, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (rolesError) {
      console.error('Error fetching user roles:', rolesError.message);
      return new Response(JSON.stringify({ error: 'Failed to verify user permissions' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
      });
    }

    const userRoles = userRolesData?.map((item: UserRole) => item.role) || [];
    const knownSuperAdminEmail = Deno.env.get('SUPER_ADMIN_EMAIL') || 'ellaadahosa@gmail.com';

    if (user.email !== knownSuperAdminEmail && !userRoles.includes('super_admin')) {
      return new Response(JSON.stringify({ error: 'Forbidden: You do not have permission to perform this action.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403,
      });
    }

    const { application_id } = await req.json();
    if (!application_id) {
      return new Response(JSON.stringify({ error: 'application_id is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      });
    }

    // Fetch the application
    const { data: application, error: fetchError } = await supabaseAdmin
      .from('affiliate_applications')
      .select('id, user_id, full_name, status')
      .eq('id', application_id)
      .single();

    if (fetchError || !application) {
      console.error('Error fetching application or not found:', fetchError?.message);
      return new Response(JSON.stringify({ error: 'Affiliate application not found.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404,
      });
    }

    if (application.status !== 'pending') {
      return new Response(JSON.stringify({ error: `Application status is '${application.status}', not 'pending'. No action taken.` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      });
    }

    // Generate unique referral code
    const referralCode = await generateUniqueReferralCode(supabaseAdmin, application.full_name);

    // Update application status and add referral code
    const { data: updatedApplication, error: updateAppError } = await supabaseAdmin
      .from('affiliate_applications')
      .update({
        status: 'approved',
        unique_referral_code: referralCode,
        updated_at: new Date().toISOString(),
      })
      .eq('id', application_id)
      .select()
      .single();

    if (updateAppError || !updatedApplication) {
      console.error('Error updating application:', updateAppError?.message);
      return new Response(JSON.stringify({ error: 'Failed to approve application.', details: updateAppError?.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
      });
    }

    // Add 'affiliate' role to the user if not already present
    const { data: existingRole, error: checkRoleError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id, role')
      .eq('user_id', application.user_id)
      .eq('role', 'affiliate')
      .maybeSingle();

    if (checkRoleError) {
      console.error('Error checking existing user role:', checkRoleError.message);
      // Proceeding with caution: if this fails, we might add a duplicate or fail to add role.
      // For now, log and attempt to add. A more robust solution might stop here.
    }

    if (!existingRole) {
      const { error: addRoleError } = await supabaseAdmin
        .from('user_roles')
        .insert({ user_id: application.user_id, role: 'affiliate' });

      if (addRoleError) {
        // This is problematic as the application is approved but role assignment failed.
        // Manual intervention might be needed.
        console.error(`CRITICAL: Failed to add 'affiliate' role for user ${application.user_id} after application ${application_id} approval. Error: ${addRoleError.message}`);
        return new Response(JSON.stringify({
          message: 'Application approved, but failed to assign affiliate role. Please check system logs.',
          application: updatedApplication,
          error_details: `Failed to assign affiliate role: ${addRoleError.message}`
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 207, // Multi-Status
        });
      }
       console.log(`Successfully added 'affiliate' role to user ${application.user_id}.`);
    } else {
      console.log(`User ${application.user_id} already has 'affiliate' role.`);
    }

    return new Response(JSON.stringify({
      message: 'Affiliate application approved successfully.',
      application: updatedApplication
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    });

  } catch (error) {
    console.error('Unhandled error in approve-affiliate-application:', error);
    return new Response(JSON.stringify({ error: 'An unexpected error occurred.', details: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    });
  }
})
