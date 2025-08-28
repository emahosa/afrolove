
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
import { usePaystackSettings } from '@/hooks/usePaystackSettings';
import { Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from '../ui/alert-dialog';

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  amount: number;
  credits?: number;
  onConfirm: () => void;
  onConfirmAutomatic: () => void;
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
  onConfirmAutomatic,
  processing,
  type
}) => {
  const { data: paystackSettings, isLoading: isLoadingPaystack } = usePaystackSettings();
  const isPaystackEnabled = paystackSettings?.enabled ?? false;

  const getPaymentMethodText = () => {
    if (isLoadingPaystack) return 'Loading payment information...';
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
            {!isPaystackEnabled && (
              <div className="text-xs text-orange-400 bg-orange-500/10 border border-orange-500/20 p-2 rounded">
                Note: Payment processing is currently in test mode
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={processing} className="bg-transparent border-white/30 hover:bg-white/10 text-white">Cancel</AlertDialogCancel>

          {isLoadingPaystack && <Button disabled><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading...</Button>}

          {!isLoadingPaystack && !isPaystackEnabled && (
            <Button onClick={onConfirmAutomatic} disabled={processing}>
              {processing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</> : (type === 'subscription' ? 'Activate Subscription' : 'Add Credits')}
            </Button>
          )}

          {!isLoadingPaystack && isPaystackEnabled && (
            <Button onClick={onConfirm} disabled={processing} className="bg-green-600 hover:bg-green-700 font-bold">
              {processing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</> : `Pay $${amount.toFixed(2)} with Paystack`}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default PaymentDialog;
