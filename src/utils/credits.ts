
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const updateUserCredits = async (userId: string, amount: number): Promise<number | null> => {
  try {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', userId)
      .single();
      
    if (profileError) {
      toast.error("Failed to update credits", {
        description: "Could not retrieve current credit balance"
      });
      return null;
    }
    
    const currentCredits = profileData.credits || 0;
    const newCredits = currentCredits + amount;
    
    const { error } = await supabase
      .from('profiles')
      .update({ credits: newCredits })
      .eq('id', userId);
      
    if (error) {
      toast.error("Failed to update credits", {
        description: error.message
      });
      return null;
    }
    
    await supabase
      .from('credit_transactions')
      .insert({
        user_id: userId,
        amount: amount,
        transaction_type: amount > 0 ? 'credit' : 'debit',
        description: amount > 0 ? 'Credits added' : 'Credits used'
      });
    
    toast.success(amount > 0 ? "Credits added" : "Credits used", {
      description: `${Math.abs(amount)} credits ${amount > 0 ? 'added to' : 'deducted from'} your account`
    });

    return newCredits;
  } catch (error: any) {
    console.error("Error updating credits:", error);
    toast.error("Failed to update credits", {
      description: error.message
    });
    return null;
  }
};

