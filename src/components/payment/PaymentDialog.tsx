
import React from 'react';
import { Button } from "../ui/button";
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
  credits,
  onConfirm,
  processing,
  type
}) => {
  const { data: paymentSettings, isLoading: isLoadingSettings } = usePaymentGatewaySettings();
  const isGatewayEnabled = paymentSettings?.enabled ?? false;
  const activeGateway = paymentSettings?.activeGateway || 'stripe';

  const getPaymentMethodText = () => {
    if (isLoadingSettings) return 'Loading payment information...';
    
    if (isGatewayEnabled) {
      const gatewayName = activeGateway.charAt(0).toUpperCase() + activeGateway.slice(1);
      return `Secure payment processing via ${gatewayName}`;
    } else {
      return 'Payment processing is currently disabled. Please contact support for assistance.';
    }
  };

  const getButtonText = () => {
    if (processing) return <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>;
    if (isLoadingSettings) return 'Loading...';
    if (isGatewayEnabled) {
      return `Pay $${amount.toFixed(2)}`;
    } else {
      return 'Payments Disabled';
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-gray-800/40 backdrop-blur-xl border-purple-500/20 text-white">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2 text-gray-400">
            <div>{description}</div>
            <div className="text-sm text-gray-500">
              {getPaymentMethodText()}
            </div>
            {!isGatewayEnabled && (
              <div className="text-xs text-orange-400 bg-orange-500/10 border border-orange-500/20 p-2 rounded">
                Note: Payment processing is currently disabled or not configured.
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="glass" disabled={processing} className="bg-red-500/10 hover:bg-red-500/20 text-red-400">Cancel</Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              onClick={onConfirm}
              disabled={processing || isLoadingSettings || !isGatewayEnabled}
              variant="glass"
            >
              {getButtonText()}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default PaymentDialog;
