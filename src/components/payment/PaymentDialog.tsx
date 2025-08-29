
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
import { useStripeSettings } from '@/hooks/useStripeSettings';
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
  credits,
  onConfirm,
  processing,
  type
}) => {
  const { data: stripeSettings, isLoading: isLoadingSettings } = useStripeSettings();
  const isStripeEnabled = stripeSettings?.enabled ?? true;

  const getPaymentMethodText = () => {
    if (isLoadingSettings) return 'Loading payment information...';
    
    if (isStripeEnabled) {
      return 'Secure payment processing via Stripe';
    } else {
      return 'Payment processing is currently disabled. Please contact support for assistance.';
    }
  };

  const getButtonText = () => {
    if (processing) return <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>;
    
    if (isLoadingSettings) return 'Loading...';
    
    if (isStripeEnabled) {
      return `Pay $${amount.toFixed(2)}`;
    } else {
      return 'Contact Support';
    }
  };

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
            {!isStripeEnabled && (
              <div className="text-xs text-orange-400 bg-orange-500/10 border border-orange-500/20 p-2 rounded">
                Note: Payment processing is currently in test mode
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={processing} className="bg-transparent border-white/30 hover:bg-white/10 text-white">Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm} 
            disabled={processing || isLoadingSettings}
            className="bg-dark-purple hover:bg-opacity-90 font-bold"
          >
            {getButtonText()}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default PaymentDialog;
