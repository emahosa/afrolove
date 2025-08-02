import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Coins, DollarSign, Zap } from 'lucide-react';
import { toast } from 'sonner';
import PaymentDialog from '@/components/payment/PaymentDialog';
import { useAffiliateTracking } from '@/hooks/useAffiliateTracking';

const Credits: React.FC = () => {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const { trackActivity } = useAffiliateTracking();

  const creditPackages = [
    { credits: 5, amount: 5, popular: false },
    { credits: 15, amount: 10, popular: false },
    { credits: 50, amount: 25, popular: true },
    { credits: 100, amount: 45, popular: false },
    { credits: 250, amount: 100, popular: false },
    { credits: 500, amount: 180, popular: false },
  ];

  const handlePurchase = async (pkg: any) => {
    if (!user) {
      toast.error('Please log in to purchase credits');
      return;
    }

    // Track subscription page visit for affiliate system
    await trackActivity('subscription_page_visit');

    setSelectedPackage(pkg);
    setPaymentDialogOpen(true);
  };

  const handleCustomPurchase = async () => {
    const amount = parseFloat(customAmount);
    if (isNaN(amount) || amount < 1) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!user) {
      toast.error('Please log in to purchase credits');
      return;
    }

    // Track subscription page visit for affiliate system
    await trackActivity('subscription_page_visit');

    const customPkg = {
      credits: Math.floor(amount),
      amount: amount,
      popular: false
    };

    setSelectedPackage(customPkg);
    setPaymentDialogOpen(true);
  };

  const processPayment = async () => {
    if (!selectedPackage || !user) return;

    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          amount: selectedPackage.amount,
          currency: 'USD',
          credits: selectedPackage.credits,
          description: `Purchase ${selectedPackage.credits} credits`
        }
      });

      if (error) throw error;

      if (data?.payment_url) {
        // Track subscription completion for affiliate system
        await trackActivity('subscription_completed', {
          amount: selectedPackage.amount,
          credits: selectedPackage.credits
        });
        
        window.location.href = data.payment_url;
      } else {
        throw new Error('Payment URL not received');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Failed to process payment');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Credits</h1>
        <p className="text-muted-foreground">Purchase credits to generate amazing songs with AI</p>
      </div>

      {/* Current Credits Display */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Coins className="mr-2 h-5 w-5" />
            Your Credits
          </CardTitle>
          <CardDescription>
            Use credits to generate songs, create custom tracks, and more
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="text-3xl font-bold text-primary">
                {profile?.credits || 0}
              </div>
              <div className="text-sm text-muted-foreground">
                credits available
              </div>
            </div>
            <Badge variant="outline" className="text-sm">
              1 credit = 1 song generation
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Credit Packages */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {creditPackages.map((pkg, index) => (
          <Card key={index} className={`relative ${pkg.popular ? 'border-primary shadow-lg' : ''}`}>
            {pkg.popular && (
              <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                Most Popular
              </Badge>
            )}
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center">
                <Zap className="mr-2 h-5 w-5" />
                {pkg.credits} Credits
              </CardTitle>
              <CardDescription>
                <span className="text-2xl font-bold text-primary">${pkg.amount}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-sm text-muted-foreground mb-4">
                ${(pkg.amount / pkg.credits).toFixed(2)} per credit
              </div>
              <Button 
                onClick={() => handlePurchase(pkg)}
                className="w-full"
                variant={pkg.popular ? "default" : "outline"}
              >
                Purchase Now
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Custom Amount Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <DollarSign className="mr-2 h-5 w-5" />
            Custom Amount
          </CardTitle>
          <CardDescription>
            Purchase any amount of credits (1 USD = 1 Credit)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <Label htmlFor="custom-amount">Amount (USD)</Label>
              <Input
                id="custom-amount"
                type="number"
                placeholder="Enter amount"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                min="1"
                step="1"
              />
            </div>
            <Button onClick={handleCustomPurchase} disabled={!customAmount}>
              Purchase
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <PaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        title="Purchase Credits"
        description={`You are about to purchase ${selectedPackage?.credits} credits for $${selectedPackage?.amount}`}
        amount={selectedPackage?.amount || 0}
        credits={selectedPackage?.credits || 0}
        onConfirm={processPayment}
        processing={processing}
        type="credits"
      />
    </div>
  );
};

export default Credits;
