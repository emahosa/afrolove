
import React from 'react';

interface PaymentLoadingScreenProps {
  title?: string;
  description?: string;
}

const PaymentLoadingScreen: React.FC<PaymentLoadingScreenProps> = ({ 
  title = "Processing Payment...",
  description = "Please wait while we confirm your payment."
}) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="text-muted-foreground text-center max-w-md">{description}</p>
    </div>
  );
};

export default PaymentLoadingScreen;
