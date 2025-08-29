declare global {
  interface Window {
    PaystackPop: any;
  }
}

export const startPaystackPayment = ({
  email,
  amount,
  reference,
  onSuccess,
  onCancel,
  publicKey,
}: {
  email: string;
  amount: number; // in Naira
  reference: string;
  onSuccess: (ref: string) => void;
  onCancel: () => void;
  publicKey: string;
}) => {
  const paystack = new window.PaystackPop();

  paystack.newTransaction({
    key: publicKey,
    email,
    amount: amount * 100, // Paystack wants Kobo
    ref: reference,
    onSuccess: (transaction: { reference: string }) => {
      onSuccess(transaction.reference);
    },
    onCancel: () => {
      onCancel();
    },
  });
};
