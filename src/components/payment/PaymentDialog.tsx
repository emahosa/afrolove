
import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { usePaymentGatewaySettings } from '@/hooks/usePaymentGatewaySettings';
import { Loader2 } from 'lucide-react';

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  amount: number;
  credits?: number;
  onConfirm: () => void;
  processing: boolean;
  type: 'credits' | 'subscription';
}

const PaymentDialog: React.FC<PaymentDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  amount,
  onConfirm,
  processing,
}) => {
  const { data: paymentSettings, isLoading: isLoadingSettings } = usePaymentGatewaySettings();

  const getPaymentMethodText = () => {
    if (isLoadingSettings) return 'Loading payment information...';
    if (!paymentSettings?.enabled) {
      return 'The payment system is currently disabled. Please contact support.';
    }
    const gatewayName = paymentSettings.activeGateway === 'stripe' ? 'Stripe' : 'Paystack';
    return `Secure payment processing via ${gatewayName}`;
  };

  const getButtonText = () => {
    if (processing) return <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>;
    if (isLoadingSettings) return 'Loading...';
    if (!paymentSettings?.enabled) {
      return 'Unavailable';
    }
    return `Pay $${(amount / 100).toFixed(2)}`; // Assuming amount is in cents
  };

  const isPaymentDisabled = processing || isLoadingSettings || !paymentSettings?.enabled;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-gray-900 border-white/10 text-white">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2 text-gray-400">
            <div>{description}</div>
            <div className="text-sm text-gray-500">
              {getPaymentMethodText()}
            </div>
            {paymentSettings?.enabled === false && (
              <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-2 rounded">
                Payments are currently disabled by the administrator.
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={processing} className="bg-transparent border-white/30 hover:bg-white/10 text-white">Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm} 
            disabled={isPaymentDisabled}
            className="bg-dark-purple hover:bg-opacity-90 font-bold disabled:bg-gray-500 disabled:cursor-not-allowed"
          >
            {getButtonText()}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default PaymentDialog;
