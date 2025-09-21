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
      // Ensure metadata always contains user info
      const meta = {
        ...payload.meta,
        user_id: user.id,
        type: payload.meta.type || 'credits', // default to 'credits' if missing
        credits: payload.meta.credits || 0,
        plan_id: payload.meta.plan_id || null,
        plan_name: payload.meta.plan_name || null,
      };

      const tx_ref = `txn_${meta.type}_${user.id}_${Date.now()}`;
      console.log("Flutterwave payment tx_ref:", tx_ref, "metadata:", meta);

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
        meta,
        customizations: payload.customizations,
        callback: async (payment: any) => {
          console.log("Flutterwave callback payment:", payment);

          try {
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
                  tx_ref,
                }),
              }
            );

            const verificationResult = await verificationResponse.json();

            if (verificationResult.success) {
              onSuccess(verificationResult.data);
            } else {
              console.error("Flutterwave verification failed:", verificationResult);
              toast.error('Payment verification failed.', {
                description:
                  verificationResult.error?.message || 'Please contact support.',
              });
            }
          } catch (err) {
            console.error("Flutterwave verification fetch error:", err);
            toast.error('Payment verification failed due to network error.');
          }
        },
        onclose: () => {
          onClose();
        },
      });
    } catch (error: any) {
      console.error('Flutterwave payment initialization error:', error);
      toast.error('Failed to initialize payment.', {
        description: error.message,
      });
    }
  };

  return { payWithFlutterwave };
}
