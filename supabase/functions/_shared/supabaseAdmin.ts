
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// WARNING: Never expose your service role key on the client-side
// This key is meant to be used in secure server environments like Edge Functions
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be defined in environment variables.');
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    // detectSessionInUrl: false, // For Deno, this is not applicable in the same way as client-side
  }
});
