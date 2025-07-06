
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PaymentVerificationResult {
  success: boolean;
  type: 'credits' | 'subscription' | null;
  message: string;
}

export const verifyPaymentSuccess = async (sessionId?: string): Promise<PaymentVerificationResult> => {
  try {
    console.log("Verifying payment success for session:", sessionId);
    
    if (!sessionId) {
      return {
        success: false,
        type: null,
        message: "No session ID provided"
      };
    }

    // Check recent payment transactions for this user
    const { data: user } = await supabase.auth.getUser();
    
    if (!user?.user) {
      return {
        success: false,
        type: null,
        message: "User not authenticated"
      };
    }

    // Check for recent payment transactions
    const { data: transactions, error: transactionError } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('user_id', user.user.id)
      .eq('payment_id', sessionId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1);

    if (transactionError) {
      console.error("Error checking transactions:", transactionError);
      return {
        success: false,
        type: null,
        message: "Error verifying payment"
      };
    }

    if (transactions && transactions.length > 0) {
      const transaction = transactions[0];
      const isCredits = transaction.credits_purchased > 0;
      
      return {
        success: true,
        type: isCredits ? 'credits' : 'subscription',
        message: isCredits 
          ? `${transaction.credits_purchased} credits added successfully`
          : "Subscription activated successfully"
      };
    }

    // Check subscription status
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.user.id)
      .eq('subscription_status', 'active')
      .order('created_at', { ascending: false })
      .limit(1);

    if (subError) {
      console.error("Error checking subscription:", subError);
      return {
        success: false,
        type: null,
        message: "Error verifying subscription"
      };
    }

    if (subscription && subscription.length > 0) {
      return {
        success: true,
        type: 'subscription',
        message: "Subscription verified successfully"
      };
    }

    return {
      success: false,
      type: null,
      message: "Payment not found or not processed yet"
    };

  } catch (error: any) {
    console.error("Payment verification error:", error);
    return {
      success: false,
      type: null,
      message: error.message || "Verification failed"
    };
  }
};

export const refreshUserData = async (): Promise<void> => {
  try {
    // Force refresh the user session to get updated data
    const { data: { session }, error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error("Error refreshing session:", error);
      return;
    }

    if (session?.user) {
      // The AuthContext will automatically update when the session changes
      console.log("User session refreshed successfully");
    }
  } catch (error) {
    console.error("Error refreshing user data:", error);
  }
};
