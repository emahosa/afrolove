
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
 * Check if credit transactions are being properly logged
 */
export const checkCreditTransactions = async (userId: string): Promise<void> => {
  try {
    const { data: transactions, error } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (error) {
      console.error("Error checking credit transactions:", error);
    } else {
      console.log("Recent credit transactions:", transactions);
    }
  } catch (error) {
    console.error("Exception checking credit transactions:", error);
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
  
  // 3. Check recent credit transactions
  await checkCreditTransactions(userId);
  
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
