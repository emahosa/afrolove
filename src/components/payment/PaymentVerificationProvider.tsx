
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { verifyPaymentSuccess } from '@/utils/paymentVerification';
import { toast } from 'sonner';

interface PaymentVerificationContextType {
  isVerifying: boolean;
  verifyPayment: (sessionId?: string) => Promise<void>;
}

const PaymentVerificationContext = createContext<PaymentVerificationContextType | undefined>(undefined);

export const usePaymentVerification = () => {
  const context = useContext(PaymentVerificationContext);
  if (!context) {
    throw new Error('usePaymentVerification must be used within PaymentVerificationProvider');
  }
  return context;
};

export const PaymentVerificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isVerifying, setIsVerifying] = useState(false);

  const verifyPayment = async (sessionId?: string) => {
    if (isVerifying) return;
    
    setIsVerifying(true);
    console.log("Starting payment verification for session:", sessionId);
    
    try {
      const result = await verifyPaymentSuccess(sessionId);
      
      if (result && result.success) {
        toast.success("Payment Successful!", {
          description: result.message,
          duration: 3000
        });
        
        // Clean up URL parameters
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
        
        // Navigate to dashboard after showing success
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
        
      } else {
        console.error("Payment verification failed:", result?.message);
        toast.error("Payment Verification Issue", {
          description: result?.message || "Unable to verify payment immediately. Your payment may still be processing.",
          duration: 5000
        });
        
        // Navigate to dashboard anyway
        setTimeout(() => {
          navigate('/dashboard');
        }, 3000);
      }
    } catch (error) {
      console.error("Payment verification error:", error);
      toast.error("Verification Error", {
        description: "Unable to verify payment. Please check your account or contact support.",
        duration: 5000
      });
      
      // Navigate to dashboard
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    const subscriptionStatus = searchParams.get('subscription');
    const sessionId = searchParams.get('session_id');

    console.log("Payment verification check:", { 
      paymentStatus, 
      subscriptionStatus, 
      sessionId,
      hasSession: !!sessionId 
    });

    if ((paymentStatus === 'success' || subscriptionStatus === 'success') && sessionId) {
      console.log("Triggering payment verification");
      verifyPayment(sessionId);
    }
  }, [searchParams]);

  return (
    <PaymentVerificationContext.Provider value={{ isVerifying, verifyPayment }}>
      {children}
    </PaymentVerificationContext.Provider>
  );
};
