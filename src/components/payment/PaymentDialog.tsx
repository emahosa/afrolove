
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Star, CreditCard, CheckCircle } from 'lucide-react';
import { useStripeSettings } from '@/hooks/useStripeSettings';

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
  const { isStripeEnabled, loading: stripeLoading } = useStripeSettings();

  const handleConfirm = () => {
    onConfirm();
  };

  if (stripeLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Loading...</DialogTitle>
            <DialogDescription>
              Checking payment configuration...
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {type === 'credits' ? (
              <Star className="h-5 w-5 text-melody-secondary" />
            ) : (
              <CheckCircle className="h-5 w-5 text-melody-secondary" />
            )}
            {title}
          </DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-between items-center py-2 border-t border-b">
            <span className="font-medium">
              {type === 'subscription' ? 'Monthly subscription' : `${credits} credits`}
            </span>
            <span className="font-bold">${amount.toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold">Total</span>
            <span className="text-lg font-bold">${amount.toFixed(2)}</span>
          </div>

          {isStripeEnabled ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CreditCard className="h-4 w-4" />
              <span>Secure payment processing via Stripe</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded">
              <CheckCircle className="h-4 w-4" />
              <span>Payment processing is currently disabled - {type === 'subscription' ? 'subscription will be activated' : 'credits will be added'} automatically</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={processing}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={processing}
            className="bg-melody-secondary hover:bg-melody-secondary/90"
          >
            {processing ? 'Processing...' : isStripeEnabled ? 'Confirm & Proceed to Payment' : 'Confirm & Activate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentDialog;
