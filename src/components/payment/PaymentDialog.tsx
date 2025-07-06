
import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CreditCard } from "lucide-react";

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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between">
            <span>{type === 'credits' ? `${credits} Credits` : 'Monthly subscription'}</span>
            <span>${amount.toFixed(2)}</span>
          </div>
          <div className="border-t pt-2 flex items-center justify-between font-bold">
            <span>Total</span>
            <span>${amount.toFixed(2)}</span>
          </div>
        </div>
        <DialogFooter className="flex-col">
          <div className="flex items-center justify-center w-full mb-4 text-sm text-muted-foreground">
            <CreditCard className="mr-2 h-4 w-4 text-green-600" />
            <span>Secure payment processing via Stripe</span>
          </div>
          <Button
            onClick={onConfirm}
            disabled={processing}
            className="w-full"
          >
            {processing ? "Processing..." : "Confirm & Proceed to Payment"}
          </Button>
          <Button 
            variant="outline" 
            className="w-full mt-2" 
            onClick={() => onOpenChange(false)}
            disabled={processing}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentDialog;
