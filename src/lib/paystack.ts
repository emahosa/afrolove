import Paystack from '@paystack/inline-js';

export const startPaystackPayment = ({
  email,
  usdAmount,
  usdToNgnRate,
  reference,
  onSuccess,
  onCancel,
  publicKey,
  metadata,
}: {
  email: string;
  usdAmount: number;
  usdToNgnRate: number;
  reference: string;
  onSuccess: (ref: string) => void;
  onCancel: () => void;
  publicKey: string;
  metadata?: Record<string, unknown>;
}) => {
  const paystack = new Paystack();
  const ngnAmountInKobo = Math.round(usdAmount * usdToNgnRate * 100);

  paystack.checkout({
    key: publicKey,
    email,
    amount: ngnAmountInKobo,
    currency: 'NGN',
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
