
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const updateUserCredits = async (userId: string, amount: number): Promise<number | null> => {
  try {
    console.log("Updating credits for user:", userId, "amount:", amount);
    
    if (!userId) {
      throw new Error("User ID is required to update credits");
    }
    
    // First check if the user profile exists
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', userId)
      .single();
      
    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
      console.error("Error fetching current credits:", profileError);
      throw new Error("Could not retrieve current credit balance");
    }
    
    let newCredits: number;
    let currentCredits = 0;
    
    // If profile doesn't exist, create it
    if (!profileData) {
      console.log("No profile found for user:", userId, "Creating new profile");
      
      const { data: insertData, error: createProfileError } = await supabase
        .from('profiles')
        .insert({ id: userId, credits: amount })
        .select('credits')
        .single();
        
      if (createProfileError) {
        console.error("Error creating profile:", createProfileError);
        throw new Error("Failed to create user profile");
      }
      
      if (!insertData) {
        throw new Error("Failed to create profile: No data returned");
      }
      
      console.log("Created new profile with initial credits:", amount);
      newCredits = amount;
    } else {
      // Update existing profile
      currentCredits = profileData.credits || 0;
      newCredits = currentCredits + amount;
      
      console.log("Current credits:", currentCredits, "New credits:", newCredits);
      
      // Update the user's credits in profiles table
      const { error } = await supabase
        .from('profiles')
        .update({ credits: newCredits })
        .eq('id', userId);
        
      if (error) {
        console.error("Error updating credits in profiles table:", error);
        throw new Error("Failed to update credits in your profile");
      }
    }
    
    // Log the transaction
    const { error: transactionError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: userId,
        amount: amount,
        transaction_type: amount > 0 ? 'credit' : 'debit',
        description: amount > 0 ? 'Credits added' : 'Credits used'
      });
    
    if (transactionError) {
      console.error("Error logging credit transaction:", transactionError);
      // Don't block the credit update if just the transaction logging fails
    }
    
    console.log("Credits updated successfully. New balance:", newCredits);
    return newCredits;
  } catch (error: any) {
    console.error("Error in updateUserCredits:", error);
    throw error; // Re-throw to be handled by the caller
  }
};
