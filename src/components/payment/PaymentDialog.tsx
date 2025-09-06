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
import { Button } from '@/components/ui/button';

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
  const isGatewayEnabled = paymentSettings?.enabled ?? false;
  const activeGateway = paymentSettings?.activeGateway || 'stripe';

  const getPaymentMethodText = () => {
    if (isLoadingSettings) return 'Loading payment information...';
    if (isGatewayEnabled) {
      const gatewayName = activeGateway.charAt(0).toUpperCase() + activeGateway.slice(1);
      return `Secure payment processing via ${gatewayName}.`;
    }
    return 'Payment processing is currently disabled.';
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="glass-surface">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <div>{description}</div>
            <div className="text-sm text-white/70">{getPaymentMethodText()}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="secondary" disabled={processing}>Cancel</Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button onClick={onConfirm} disabled={processing || isLoadingSettings || !isGatewayEnabled}>
              {processing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</> : `Pay $${amount.toFixed(2)}`}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default PaymentDialog;
