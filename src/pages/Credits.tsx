import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coins, Zap } from 'lucide-react';
import { toast } from 'sonner';
import PaymentDialog from '@/components/payment/PaymentDialog';
import { usePaymentGatewaySettings } from '@/hooks/usePaymentGatewaySettings';

interface CreditPackage {
  id: string;
  credits: number;
  amount: number;
  popular: boolean;
}

interface DialogState {
  open: boolean;
  data: CreditPackage | null;
}

const Credits: React.FC = () => {
  const { user } = useAuth();
  const { data: paymentSettings, isLoading: isLoadingSettings } = usePaymentGatewaySettings();
  const [userProfile, setUserProfile] = useState<{ credits: number } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dialogState, setDialogState] = useState<DialogState>({
    open: false,
    data: null,
  });

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) return;
      const { data, error } = await supabase.from('profiles').select('credits').eq('id', user.id).single();
      if (!error && data) setUserProfile(data);
    };
    fetchUserProfile();
  }, [user]);

  const creditPackages: CreditPackage[] = [
    { id: 'pkg_5', credits: 5, amount: 5, popular: false },
    { id: 'pkg_15', credits: 15, amount: 10, popular: false },
    { id: 'pkg_50', credits: 50, amount: 25, popular: true },
    { id: 'pkg_100', credits: 100, amount: 45, popular: false },
  ];

  const handleOpenDialog = (data: CreditPackage) => {
    setDialogState({ open: true, data });
  };

  const processCreditPurchase = async () => {
    if (!dialogState.data) return;
    const pkg = dialogState.data;
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          amount: Math.round(pkg.amount * 100),
          credits: pkg.credits,
          packId: pkg.id,
          description: `Purchase of ${pkg.credits} credits`,
        }
      });

      if (error) throw new Error(error.message);
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Could not initialize payment. Please contact support.');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast.error("Payment Failed", { description: errorMessage });
      setIsProcessing(false);
      setDialogState({ open: false, data: null });
    }
  };

  const getDialogDetails = () => {
    if (!dialogState.data) return {};
    const pkg = dialogState.data;
    return {
      title: "Purchase Credits",
      description: `You are about to purchase ${pkg.credits} credits for $${pkg.amount}.`,
      amount: Math.round(pkg.amount * 100),
      onConfirm: processCreditPurchase,
    };
  };

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 text-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2 text-white">Buy Credits</h1>
        <p className="text-gray-400">Purchase credits to generate amazing songs with AI.</p>
      </div>
      <Card className="mb-8 bg-white/5 border-white/10 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center text-white"><Coins className="mr-2 h-5 w-5 text-dark-purple" />Your Credits</CardTitle>
          <CardDescription className="text-gray-400">Use credits to generate songs, create custom tracks, and more.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="text-3xl font-bold text-dark-purple">{userProfile?.credits ?? 0}</div>
              <div className="text-sm text-gray-400">credits available</div>
            </div>
            <Badge variant="outline" className="text-sm border-white/20 text-gray-300">20 credits = 1 song generation</Badge>
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {creditPackages.map((pkg) => (
          <Card key={pkg.id} className={`relative bg-black/20 border-white/10 ${pkg.popular ? 'border-dark-purple shadow-lg' : ''}`}>
            {pkg.popular && <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-dark-purple text-white">Most Popular</Badge>}
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center text-white"><Zap className="mr-2 h-5 w-5 text-dark-purple" />{pkg.credits} Credits</CardTitle>
              <CardDescription><span className="text-2xl font-bold text-dark-purple">${pkg.amount}</span></CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-sm text-gray-400 mb-4">${(pkg.amount / pkg.credits).toFixed(2)} per credit</div>
              <Button disabled={isLoadingSettings || !paymentSettings?.enabled} onClick={() => handleOpenDialog(pkg)} className="w-full" variant={pkg.popular ? "default" : "outline"}>Purchase Now</Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <PaymentDialog
        open={dialogState.open}
        onOpenChange={(open) => setDialogState({ ...dialogState, open: open, data: open ? dialogState.data : null })}
        title={getDialogDetails().title || ''}
        description={getDialogDetails().description || ''}
        amount={getDialogDetails().amount || 0}
        onConfirm={getDialogDetails().onConfirm || (() => {})}
        processing={isProcessing}
        type="credits"
      />
    </div>
  );
};

export default Credits;
