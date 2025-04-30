
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const updateUserCredits = async (userId: string, amount: number): Promise<number | null> => {
  try {
    console.log("Updating credits for user:", userId, "amount:", amount);
    
    if (!userId) {
      console.error("User ID is required to update credits");
      throw new Error("User ID is required to update credits");
    }

    // First check if user profile exists
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('credits, id')
      .eq('id', userId)
      .maybeSingle();
    
    if (profileError) {
      console.error("Error fetching user profile:", profileError);
      throw new Error("Failed to fetch user profile");
    }
    
    // If profile doesn't exist, try to create it
    if (!profileData) {
      console.log("Profile not found for user:", userId, "Attempting to create one");
      
      // Get user data from auth
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError || !userData.user) {
        console.error("Error getting user data:", userError);
        throw new Error("Failed to get user data to create profile");
      }
      
      // Create profile
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          full_name: userData.user.user_metadata?.name || "User",
          username: userData.user.email,
          credits: amount > 0 ? amount : 0,
          avatar_url: userData.user.user_metadata?.avatar_url,
        })
        .select('credits')
        .single();
        
      if (createError) {
        console.error("Error creating user profile:", createError);
        throw new Error("Failed to create user profile");
      }
      
      console.log("Created new profile with credits:", newProfile.credits);
      
      // Log this transaction
      try {
        await logCreditTransaction(userId, amount, amount > 0 ? 'credit' : 'debit');
      } catch (e) {
        console.error("Failed to log credit transaction:", e);
        // Continue even if transaction logging fails
      }
      
      return newProfile.credits;
    }
    
    // Calculate new credit balance
    const currentCredits = profileData.credits || 0;
    const newCreditBalance = currentCredits + amount;
    
    console.log(`Current credits: ${currentCredits}, new balance will be: ${newCreditBalance}`);
    
    // Update the profile with the new credit balance
    const { data: updateData, error: updateError } = await supabase
      .from('profiles')
      .update({ credits: newCreditBalance })
      .eq('id', userId)
      .select('credits')
      .single();
    
    if (updateError) {
      console.error("Error updating user credits:", updateError);
      throw new Error("Failed to update credits");
    }
    
    console.log("Credits updated successfully. New balance:", updateData?.credits);
    
    // Log the transaction
    try {
      await logCreditTransaction(userId, amount, amount > 0 ? 'credit' : 'debit');
    } catch (e) {
      console.error("Failed to log credit transaction:", e);
      // Continue even if transaction logging fails
    }
    
    return updateData?.credits || null;
    
  } catch (error: any) {
    console.error("Error in updateUserCredits:", error);
    throw error; // Re-throw to be handled by the caller
  }
};

// Helper function to log credit transactions
const logCreditTransaction = async (
  userId: string, 
  amount: number,
  transactionType: 'credit' | 'debit',
  description?: string
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: userId,
        amount: amount,
        transaction_type: transactionType,
        description: description || (amount > 0 ? 'Credits added' : 'Credits used')
      });
      
    if (error) {
      console.error("Error logging credit transaction:", error);
      throw error;
    }
  } catch (err) {
    console.error("Exception in credit transaction logging:", err);
    throw err;
  }
};
