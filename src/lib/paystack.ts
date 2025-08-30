import Paystack from '@paystack/inline-js';

export const startPaystackPayment = ({
  email,
  amount,
  reference,
  metadata,
  onSuccess,
  onCancel,
  publicKey,
}: {
  email: string;
  amount: number; // in Naira
  reference: string;
  metadata: Record<string, any>;
  onSuccess: (ref: string) => void;
  onCancel: () => void;
  publicKey: string;
}) => {
  const paystack = new Paystack();

  paystack.checkout({
    key: publicKey,
    email,
    amount: amount * 100, // Paystack wants Kobo
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
