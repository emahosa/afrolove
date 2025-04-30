
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
    console.log("Testing update_user_credits function existence...");
    
    // First, let's verify the exact function signature by checking available functions
    const { data: functionsList, error: functionsError } = await supabase
      .from('pg_catalog.pg_proc')
      .select('*')
      .ilike('proname', '%update_user_credits%');
      
    if (functionsError) {
      console.error("Error checking available functions:", functionsError);
    } else {
      console.log("Found functions matching 'update_user_credits':", functionsList);
    }
    
    // This is a lightweight call to check if the function exists with correct parameters
    const { data, error } = await supabase.rpc(
      'update_user_credits', 
      { 
        p_user_id: '00000000-0000-0000-0000-000000000000',  // Dummy UUID
        p_amount: 0  // Zero amount won't change anything
      }
    );
    
    if (error) {
      console.error("RPC function check failed:", error.message);
      if (error.message.includes("Could not find the function")) {
        console.error("The function may not be deployed or has different parameter names/order");
        console.error("Error details:", error);
      }
    } else {
      console.log("RPC function exists and can be called successfully");
      console.log("Return value:", data);
    }
    
    // Try with alternative parameter ordering to debug
    console.log("Trying alternative parameter ordering...");
    const { data: altData, error: altError } = await supabase.rpc(
      'update_user_credits', 
      { 
        // Try with parameters reversed to see if that works
        p_amount: 0,
        p_user_id: '00000000-0000-0000-0000-000000000000'
      }
    );
    
    if (altError) {
      console.error("Alternative parameter ordering failed:", altError.message);
    } else {
      console.log("Alternative parameter ordering worked! Return value:", altData);
      console.warn("WARNING: Function is accepting parameters in reverse order!");
    }
    
  } catch (error: any) {
    console.error("Exception during RPC function check:", error);
  }
};

/**
 * Run a comprehensive check of all database functions related to credits
 */
export const debugCreditsSystem = async (userId: string): Promise<void> => {
  console.log("Running comprehensive credits system debug...");
  
  // 1. Check if the user profile exists
  await checkProfileExists(userId);
  
  // 2. Check RLS permissions on relevant tables
  await checkRlsPermissions('profiles');
  await checkRlsPermissions('credit_transactions');
  
  // 3. Check function existence
  await checkUpdateCreditsFunction();
  
  // 4. Try to query directly if possible
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', userId)
      .single();
      
    if (error) {
      console.error("Error getting user credits directly:", error);
    } else {
      console.log("Current user credits:", data?.credits);
    }
  } catch (error: any) {
    console.error("Exception getting credits:", error);
  }
  
  console.log("Credits system debug complete");
};
