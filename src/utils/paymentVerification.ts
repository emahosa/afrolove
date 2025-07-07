
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

    // Wait longer for webhook processing (webhooks can be slow)
    console.log("⏳ Waiting for webhook to process...");
    await new Promise(resolve => setTimeout(resolve, 8000));

    // Try to verify payment with more attempts and longer waits
    let attempts = 0;
    const maxAttempts = 30; // Increased attempts
    
    while (attempts < maxAttempts) {
      console.log(`🔄 Verification attempt ${attempts + 1}/${maxAttempts}`);
      
      try {
        // Check for payment transaction first (this should always be created)
        const { data: transactionData, error: transactionError } = await supabase
          .from('payment_transactions')
          .select('*')
          .eq('user_id', user.user.id)
          .eq('payment_id', sessionId)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(1);

        console.log("💳 Transaction check result:", { transactionData, transactionError });

        if (!transactionError && transactionData && transactionData.length > 0) {
          const transaction = transactionData[0];
          console.log("✅ Payment transaction found:", transaction);
          
          const isCredits = transaction.credits_purchased > 0;
          
          if (isCredits) {
            // For credits, refresh session and show success
            console.log("🔄 Refreshing user session for credits...");
            await supabase.auth.refreshSession();
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            return {
              success: true,
              type: 'credits',
              message: `${transaction.credits_purchased} credits added successfully`
            };
          } else {
            // For subscription, check if subscription record was created
            const { data: subData, error: subError } = await supabase
              .from('user_subscriptions')
              .select('*')
              .eq('user_id', user.user.id)
              .eq('subscription_status', 'active')
              .order('created_at', { ascending: false })
              .limit(1);

            console.log("📋 Subscription check result:", { subData, subError });

            if (!subError && subData && subData.length > 0) {
              console.log("✅ Active subscription found:", subData[0]);
              
              console.log("🔄 Refreshing user session for subscription...");
              await supabase.auth.refreshSession();
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              return {
                success: true,
                type: 'subscription',
                message: "Subscription activated successfully"
              };
            }
          }
        }
        
        // If no transaction found yet, check for any recent active subscription (fallback)
        const { data: recentSubData, error: recentSubError } = await supabase
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', user.user.id)
          .eq('subscription_status', 'active')
          .order('created_at', { ascending: false })
          .limit(1);

        if (!recentSubError && recentSubData && recentSubData.length > 0) {
          const subscription = recentSubData[0];
          console.log("✅ Found recent active subscription:", subscription);
          
          // Check if this is recent (within last 15 minutes)
          const subscriptionTime = new Date(subscription.created_at || subscription.updated_at);
          const now = new Date();
          const timeDiff = now.getTime() - subscriptionTime.getTime();
          const fifteenMinutes = 15 * 60 * 1000;
          
          if (timeDiff <= fifteenMinutes) {
            console.log("🔄 Refreshing user session for recent subscription...");
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
        // Wait longer between attempts
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    console.log("⚠️  Payment verification timed out after", maxAttempts, "attempts");
    console.log("🔄 Force refreshing session as fallback...");
    
    // Force refresh and reload as last resort
    await supabase.auth.refreshSession();
    setTimeout(() => {
      window.location.reload();
    }, 2000);
    
    return {
      success: false,
      type: null,
      message: "Payment processing is taking longer than expected. Please refresh the page in a moment to see your updated balance. Contact support if the issue persists."
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
