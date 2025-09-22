import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

declare global {
  interface Window {
    FlutterwaveCheckout?: (options: any) => { close: () => void };
  }
}

interface FlutterwavePaymentPayload {
  publicKey: string;
  amount: number;
  currency: string;
  payment_options: string;
  customer: {
    email: string;
    name?: string;
  };
  meta: any;
  customizations: {
    title: string;
    description: string;
    logo?: string;
  };
}

interface UseFlutterwaveProps {
  onSuccess: (transaction: any) => void;
  onClose: () => void;
}

export function useFlutterwave({ onSuccess, onClose }: UseFlutterwaveProps) {
  const { user } = useAuth();

  const payWithFlutterwave = async (payload: FlutterwavePaymentPayload) => {
    if (!user) {
      toast.error('You must be logged in to make a payment.');
      return;
    }

    try {
      const tx_ref = `txn_${payload.meta.type}_${user.id}_${Date.now()}`;
      
      console.log('🚀 Flutterwave: Initializing payment with tx_ref:', tx_ref);
      console.log('📋 Flutterwave: Full payload being sent:', {
        ...payload,
        tx_ref,
        customer: payload.customer,
        meta: payload.meta
      });

      window.FlutterwaveCheckout?.({
        public_key: payload.publicKey,
        tx_ref,
        amount: payload.amount,
        currency: payload.currency,
        payment_options: payload.payment_options,
        customer: {
          email: user.email!,
          name: payload.customer.name || user.user_metadata?.full_name || user.name || 'Valued Customer',
          phone_number: user.user_metadata?.phone || '',
        },
        meta: {
          ...payload.meta,
          user_id: user.id, // Ensure the user_id is always present
          tx_ref: tx_ref,
          timestamp: new Date().toISOString()
        },
        customizations: payload.customizations,
        callback: async (payment: any) => {
          console.log('✅ Flutterwave: Payment callback received:', payment);
          
          // Flutterwave closes the modal automatically
          try {
            console.log('🔍 Flutterwave: Verifying payment with backend...');
            
            const verificationPayload = {
              transaction_id: payment.transaction_id,
              tx_ref: tx_ref,
              type: payload.meta.type,
              user_id: payload.meta.user_id,
              credits: payload.meta.credits,
              plan_id: payload.meta.plan_id,
              plan_name: payload.meta.plan_name,
              amount: payload.amount
            };
            
            console.log('📤 Flutterwave: Verification payload:', verificationPayload);
            
            const verificationResponse = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-flw`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                },
                body: JSON.stringify(verificationPayload),
              }
            );

            if (!verificationResponse.ok) {
              throw new Error(`Verification request failed: ${verificationResponse.status}`);
            }
            
            const verificationResult = await verificationResponse.json();
            console.log('📥 Flutterwave: Verification result:', verificationResult);

            if (verificationResult.success) {
              console.log('✅ Flutterwave: Payment verified successfully');
              onSuccess(verificationResult.data || payment);
            } else {
              console.error('❌ Flutterwave: Payment verification failed:', verificationResult);
              toast.error('Payment verification failed.', {
                description: verificationResult.error?.message || 'Please contact support.',
              });
            }
          } catch (verificationError) {
            console.error('💥 Flutterwave: Verification error:', verificationError);
            toast.error('Payment verification failed.', {
              description: 'Unable to verify payment. Please contact support.',
            });
          }
        },
        onclose: () => {
          console.log('🚪 Flutterwave: Payment modal closed');
          onClose();
        },
      });
    } catch (error: any) {
      console.error('💥 Flutterwave payment initialization error:', error);
      toast.error('Failed to initialize payment.', {
        description: error.message,
      });
    }
  };

  return { payWithFlutterwave };
}
