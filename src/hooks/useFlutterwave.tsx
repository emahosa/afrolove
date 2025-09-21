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
    console.log("Initiating Flutterwave payment with payload:", payload); // Added for debugging
    if (!user) {
      toast.error('You must be logged in to make a payment.');
      return;
    }

    try {
      const tx_ref = `txn_${payload.meta.type}_${user.id}_${Date.now()}`;

      window.FlutterwaveCheckout?.({
        public_key: payload.publicKey,
        tx_ref,
        amount: payload.amount,
        currency: payload.currency,
        payment_options: payload.payment_options,
        customer: {
          email: user.email!,
          name: user.user_metadata?.full_name || 'Valued Customer',
        },
        meta: payload.meta,
        customizations: payload.customizations,
        callback: async (payment: any) => {
          // Flutterwave closes the modal automatically
          const verificationResponse = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-flw`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              },
              body: JSON.stringify({
                transaction_id: payment.transaction_id,
                tx_ref: tx_ref,
              }),
            }
          );

          const verificationResult = await verificationResponse.json();

          if (verificationResult.success) {
            onSuccess(verificationResult.data);
          } else {
            toast.error('Payment verification failed.', {
              description:
                verificationResult.error?.message || 'Please contact support.',
            });
          }
        },
        onclose: () => {
          onClose();
        },
      });
    } catch (error: any) {
      console.error('Flutterwave payment error:', error);
      toast.error('Failed to initialize payment.', {
        description: error.message,
      });
    }
  };

  return { payWithFlutterwave };
}
