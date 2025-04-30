
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const updateUserCredits = async (userId: string, amount: number): Promise<number | null> => {
  try {
    console.log("Updating credits for user:", userId, "amount:", amount);
    
    if (!userId) {
      throw new Error("User ID is required to update credits");
    }
    
    // Debug log to show exactly what we're sending to the RPC function
    console.log("Calling update_user_credits RPC with params:", {
      p_user_id: userId,
      p_amount: amount
    });
    
    // Force correct parameter ordering in the object to match SQL function definition
    const params = {
      p_user_id: userId,
      p_amount: amount
    };
    
    console.log("Final parameters being sent to RPC:", params);
    
    // Use the update_user_credits RPC function
    // TypeScript doesn't recognize our custom RPC functions, so we need to cast it
    const { data: upsertData, error: upsertError } = await supabase.rpc(
      'update_user_credits', 
      params
    );
      
    if (upsertError) {
      console.error("Error in update_user_credits RPC:", upsertError);
      throw new Error(upsertError.message || "Failed to update credits");
    }
    
    // Log the transaction (which will succeed only if proper RLS is in place)
    try {
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
    } catch (transactionErr) {
      console.error("Exception in credit transaction logging:", transactionErr);
      // Continue execution, don't throw here
    }
    
    // The RPC will return the new credit balance
    console.log("Credits updated successfully. New balance:", upsertData);
    // Ensure we return a number type
    return upsertData as number; 
  } catch (error: any) {
    console.error("Error in updateUserCredits:", error);
    throw error; // Re-throw to be handled by the caller
  }
};
