
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PaymentVerificationResult {
  success: boolean;
  type: 'credits' | 'subscription' | null;
  message: string;
}

export const verifyPaymentSuccess = async (sessionId?: string): Promise<PaymentVerificationResult> => {
  try {
    console.log("🔍 Starting payment verification for session:", sessionId);
    
    if (!sessionId) {
      return {
        success: false,
        type: null,
        message: "No session ID provided"
      };
    }

    const { data: user } = await supabase.auth.getUser();
    
    if (!user?.user) {
      return {
        success: false,
        type: null,
        message: "User not authenticated"
      };
    }

    console.log("👤 User authenticated:", user.user.id);

    // Wait for webhook processing
    console.log("⏳ Waiting for webhook to process...");
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Try to verify payment with multiple attempts
    let attempts = 0;
    const maxAttempts = 20;
    
    while (attempts < maxAttempts) {
      console.log(`🔄 Verification attempt ${attempts + 1}/${maxAttempts}`);
      
      try {
        // Check for payment transaction
        const { data: transactionData, error: transactionError } = await supabase
          .from('payment_transactions')
          .select('*')
          .eq('user_id', user.user.id)
          .eq('payment_id', sessionId)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(1);

        if (!transactionError && transactionData && transactionData.length > 0) {
          const transaction = transactionData[0];
          console.log("✅ Payment transaction found:", transaction);
          
          const isCredits = transaction.credits_purchased > 0;
          
          // Force refresh user session and data
          console.log("🔄 Refreshing user session...");
          await supabase.auth.refreshSession();
          
          // Wait a moment for data to propagate
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          return {
            success: true,
            type: isCredits ? 'credits' : 'subscription',
            message: isCredits 
              ? `${transaction.credits_purchased} credits added successfully`
              : "Subscription activated successfully"
          };
        }
        
        // Check for subscription updates
        const { data: subData, error: subError } = await supabase
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', user.user.id)
          .eq('subscription_status', 'active')
          .order('created_at', { ascending: false })
          .limit(1);

        if (!subError && subData && subData.length > 0) {
          const subscription = subData[0];
          console.log("✅ Active subscription found:", subscription);
          
          // Check if this is recent (within last 10 minutes)
          const subscriptionTime = new Date(subscription.created_at || subscription.updated_at);
          const now = new Date();
          const timeDiff = now.getTime() - subscriptionTime.getTime();
          const tenMinutes = 10 * 60 * 1000;
          
          if (timeDiff <= tenMinutes) {
            console.log("🔄 Refreshing user session...");
            await supabase.auth.refreshSession();
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            return {
              success: true,
              type: 'subscription',
              message: "Subscription verified and activated successfully"
            };
          }
        }
        
      } catch (attemptError) {
        console.error(`❌ Error in attempt ${attempts + 1}:`, attemptError);
      }
      
      attempts++;
      if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    console.log("⚠️  Payment verification timed out after", maxAttempts, "attempts");
    return {
      success: false,
      type: null,
      message: "Payment verification timed out. Please refresh the page to see your updated balance or contact support if the issue persists."
    };

  } catch (error: any) {
    console.error("💥 Payment verification error:", error);
    return {
      success: false,
      type: null,
      message: error.message || "Verification failed"
    };
  }
};

export const refreshUserData = async (): Promise<void> => {
  try {
    console.log("🔄 Refreshing user data...");
    
    const { error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error("❌ Error refreshing session:", error);
    } else {
      console.log("✅ User session refreshed successfully");
    }

    // Trigger a page reload to ensure fresh data
    setTimeout(() => {
      window.location.reload();
    }, 2000);
    
  } catch (error) {
    console.error("💥 Error refreshing user data:", error);
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  }
};
