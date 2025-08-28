
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
import { usePaystackSettings } from '@/hooks/usePaystackSettings';
import { Loader2 } from 'lucide-react';
import { Button } from '../ui/button';

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  amount: number;
  credits?: number;
  onConfirm: (method: 'stripe' | 'automatic') => void;
  onConfirmPaystack: () => void;
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
  onConfirmPaystack,
  processing,
  type
}) => {
  const { data: stripeSettings, isLoading: isLoadingStripe } = useStripeSettings();
  const { data: paystackSettings, isLoading: isLoadingPaystack } = usePaystackSettings();

  const isStripeEnabled = stripeSettings?.enabled ?? true;
  const isPaystackEnabled = paystackSettings?.enabled ?? false;
  const isLoadingSettings = isLoadingStripe || isLoadingPaystack;

  const getPaymentMethodText = () => {
    if (isLoadingSettings) return 'Loading payment information...';
    
    if (isStripeEnabled && isPaystackEnabled) return 'Secure payment processing via Stripe or Paystack';
    if (isStripeEnabled) return 'Secure payment processing via Stripe';
    if (isPaystackEnabled) return 'Secure payment processing via Paystack';

    return type === 'subscription'
      ? 'Subscription will be activated automatically'
      : 'Credits will be added automatically';
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
            {!isStripeEnabled && !isPaystackEnabled && (
              <div className="text-xs text-orange-400 bg-orange-500/10 border border-orange-500/20 p-2 rounded">
                Note: Payment processing is currently in test mode
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={processing} className="bg-transparent border-white/30 hover:bg-white/10 text-white">Cancel</AlertDialogCancel>

          {isLoadingSettings && <Button disabled><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading...</Button>}

          {!isLoadingSettings && !isStripeEnabled && !isPaystackEnabled && (
            <Button onClick={() => onConfirm('automatic')} disabled={processing}>
              {processing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</> : (type === 'subscription' ? 'Activate Subscription' : 'Add Credits')}
            </Button>
          )}

          {!isLoadingSettings && isStripeEnabled && (
             <Button onClick={() => onConfirm('stripe')} disabled={processing} className="bg-dark-purple hover:bg-opacity-90 font-bold">
               {processing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</> : `Pay $${amount.toFixed(2)} with Stripe`}
             </Button>
          )}

          {!isLoadingSettings && isPaystackEnabled && (
            <Button onClick={onConfirmPaystack} disabled={processing} className="bg-green-600 hover:bg-green-700 font-bold">
              {processing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</> : `Pay $${amount.toFixed(2)} with Paystack`}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default PaymentDialog;
