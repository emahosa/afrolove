import Paystack from '@paystack/inline-js';

export const startPaystackPayment = ({
  email,
  amount,
  reference,
  onSuccess,
  onCancel,
  publicKey,
  metadata,
}: {
  email: string;
  amount: number; // in USD
  reference: string;
  onSuccess: (ref: string) => void;
  onCancel: () => void;
  publicKey: string;
  metadata?: Record<string, unknown>;
}) => {
  const paystack = new Paystack();

  paystack.checkout({
    key: publicKey,
    email,
    amount: amount * 100, // Paystack wants cents
    currency: 'USD',
    ref: reference,
    metadata,
    onSuccess: (transaction: { reference: string }) => {
      onSuccess(transaction.reference);
    },
    onCancel: () => {
      onCancel();
    },
  });
};
