
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { verifyPaymentSuccess, refreshUserData } from '@/utils/paymentVerification';
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
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      let attempts = 0;
      let result;
      
      while (attempts < 3) {
        result = await verifyPaymentSuccess(sessionId);
        
        if (result && result.success) {
          break;
        }
        
        attempts++;
        if (attempts < 3) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }
      
      if (result && result.success) {
        toast.success("Payment Successful!", {
          description: result.message
        });
        
        await refreshUserData();
        
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
        
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      } else {
        toast.warning("Payment Processing", {
          description: "Your payment is being processed. Please check back in a moment."
        });
      }
    } catch (error) {
      console.error("Payment verification error:", error);
      toast.error("Verification Error", {
        description: "Unable to verify payment. Please contact support if the issue persists."
      });
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    const subscriptionStatus = searchParams.get('subscription');
    const sessionId = searchParams.get('session_id');

    if ((paymentStatus === 'success' || subscriptionStatus === 'success') && sessionId) {
      verifyPayment(sessionId);
    }
  }, [searchParams]);

  return (
    <PaymentVerificationContext.Provider value={{ isVerifying, verifyPayment }}>
      {children}
    </PaymentVerificationContext.Provider>
  );
};
