
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
      return type === 'subscription' 
        ? 'Subscription will be activated automatically'
        : 'Credits will be added automatically';
    }
  };

  const getButtonText = () => {
    if (processing) return <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>;
    
    if (isLoadingSettings) return 'Loading...';
    
    if (isStripeEnabled) {
      return `Pay $${amount.toFixed(2)}`;
    } else {
      return type === 'subscription' ? 'Activate Subscription' : 'Add Credits';
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <div>{description}</div>
            <div className="text-sm text-muted-foreground">
              {getPaymentMethodText()}
            </div>
            {!isStripeEnabled && (
              <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
                Note: Payment processing is currently in test mode
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm} 
            disabled={processing || isLoadingSettings}
          >
            {getButtonText()}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default PaymentDialog;
