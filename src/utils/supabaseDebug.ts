
import { supabase } from "@/integrations/supabase/client";

/**
 * Helper function to check RLS policies for the current user
 * @param tableName - The table to check permissions on
 */
export const checkRlsPermissions = async (tableName: string): Promise<void> => {
  // Check for read permissions
  // Use explicit type casting for dynamic table names
  const { data: readData, error: readError } = await supabase
    .from(tableName as any)
    .select('*')
    .limit(1);
  
  console.log(`RLS check for ${tableName} - READ:`, 
    readError ? `ERROR: ${readError.message}` : 'SUCCESS');
  
  // Check if we can get the user session
  const { data: { session } } = await supabase.auth.getSession();
  
  console.log('Current auth session:', session ? 'Active' : 'None');
  if (session?.user) {
    console.log('Current user ID:', session.user.id);
  }
};

/**
 * Helper function to get a profile directly for debugging
 */
export const checkProfileExists = async (userId: string): Promise<void> => {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
    
  console.log('Profile check:', error ? `ERROR: ${error.message}` : 'SUCCESS');
  console.log('Profile data:', profile);
};

/**
 * Helper function to check if the update_user_credits function exists
 */
export const checkUpdateCreditsFunction = async (): Promise<void> => {
  try {
    // This is a lightweight call to check if the function exists
    // We're not actually updating any credits
    const { data, error } = await supabase.rpc(
      'update_user_credits' as any, 
      { 
        p_user_id: '00000000-0000-0000-0000-000000000000',  // Dummy UUID
        p_amount: 0  // Zero amount won't change anything
      }
    );
    
    if (error) {
      console.error("RPC function check failed:", error.message);
      if (error.message.includes("Could not find the function")) {
        console.error("The function may not be deployed or has different parameter names/order");
      }
    } else {
      console.log("RPC function exists and can be called");
    }
    
  } catch (error: any) {
    console.error("Exception during RPC function check:", error);
  }
};
