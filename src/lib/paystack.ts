import { loadScript } from '@/utils/loadScript';

declare global {
  interface Window {
    PaystackPop: any;
  }
}

const PAYSTACK_SCRIPT_URL = 'https://js.paystack.co/v1/inline.js';

export const startPaystackPayment = async ({
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
  try {
    await loadScript(PAYSTACK_SCRIPT_URL);

    if (!window.PaystackPop) {
      throw new Error('Paystack script loaded but PaystackPop not found on window.');
    }

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
  } catch (error) {
    console.error('Error starting Paystack payment:', error);
    // Optionally, you could call a user-facing error reporting function here.
    // For now, we just log the error to the console.
  }
};
