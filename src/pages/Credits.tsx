import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Coins, DollarSign, Zap } from 'lucide-react';
import { toast } from 'sonner';
import PaymentDialog from '@/components/payment/PaymentDialog';
import { useAffiliateTracking } from '@/hooks/useAffiliateTracking';

const Credits: React.FC = () => {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const { trackActivity } = useAffiliateTracking();

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) return;
      const { data, error } = await supabase.from('profiles').select('credits').eq('id', user.id).single();
      if (!error && data) setUserProfile(data);
    };
    fetchUserProfile();
  }, [user]);

  const creditPackages = [
    { id: 'pack_5', credits: 5, amount: 5, popular: false },
    { id: 'pack_15', credits: 15, amount: 10, popular: false },
    { id: 'pack_50', credits: 50, amount: 25, popular: true },
    { id: 'pack_100', credits: 100, amount: 45, popular: false },
  ];

  const processPayment = async () => {
    if (!user) {
      toast.error("Please log in to purchase credits.");
      return;
    }
    if (!selectedPackage) {
      toast.error("No credit package selected.");
      return;
    }

    setProcessing(true);
    try {
      trackActivity('credit_purchase_start');

      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          amount: Math.round(selectedPackage.amount * 100),
          credits: selectedPackage.credits,
          description: `Purchase of ${selectedPackage.credits} credits`,
          packId: selectedPackage.id || `custom_${selectedPackage.amount}`,
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to create payment session.');
      }

      if (data?.url) {
        trackActivity('credit_purchase_redirect');
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned from payment processor.');
      }

      setPaymentDialogOpen(false);
    } catch (error: any) {
      console.error("Error purchasing credits:", error);
      toast.error("Purchase failed", {
        description: error.message || "There was an error processing your payment. Please try again.",
      });
      trackActivity('credit_purchase_failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleCustomPurchase = () => {
    const amount = parseFloat(customAmount);
    if (isNaN(amount) || amount < 1) {
      toast.error('Please enter a valid amount of at least $1.');
      return;
    }
    setSelectedPackage({
      id: `custom_${amount}`,
      credits: Math.floor(amount), // 1 USD = 1 Credit
      amount: amount
    });
    setPaymentDialogOpen(true);
  };

  return (
    <>
      <div className="container mx-auto py-8 px-4 md:px-6 text-white">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight mb-2 text-white">Buy Credits</h1>
          <p className="text-xl text-gray-400">
            Instantly top up your account to continue creating amazing AI-powered music.
          </p>
        </div>

        <Card className="mb-8 bg-white/5 border-white/10 backdrop-blur-sm max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <Coins className="mr-2 h-6 w-6 text-dark-purple" />
              Your Current Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-baseline space-x-3">
                <div className="text-4xl font-bold text-dark-purple">{userProfile?.credits ?? <div className="h-10 w-16 bg-gray-700 rounded animate-pulse" />}</div>
                <div className="text-lg text-gray-400">credits</div>
              </div>
              <Badge variant="outline" className="text-sm border-white/20 text-gray-300 py-1 px-3">
                1 song ≈ 20 credits
              </Badge>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {creditPackages.map((pkg) => (
            <Card key={pkg.id} className={`relative flex flex-col bg-black/20 border-white/10 hover:border-dark-purple transition-all duration-300 ${pkg.popular ? 'border-dark-purple shadow-lg scale-105' : ''}`}>
              {pkg.popular && <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-dark-purple text-white px-3 py-1 text-sm font-bold">Most Popular</Badge>}
              <CardHeader className="text-center pt-8">
                <CardTitle className="flex items-center justify-center text-3xl font-bold text-white">
                  <Zap className="mr-2 h-7 w-7 text-dark-purple" />
                  {pkg.credits}
                </CardTitle>
                <CardDescription className="text-gray-400">Credits</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow flex flex-col justify-center items-center text-center">
                <p className="text-3xl font-bold text-dark-purple mb-2">${pkg.amount}</p>
                <p className="text-sm text-gray-400 mb-4">${(pkg.amount / pkg.credits).toFixed(2)} per credit</p>
              </CardContent>
              <div className="p-4 mt-auto">
                <Button onClick={() => { setSelectedPackage(pkg); setPaymentDialogOpen(true); }} className="w-full bg-dark-purple hover:bg-opacity-90 font-bold py-3 text-lg">
                  Purchase Now
                </Button>
              </div>
            </Card>
          ))}
        </div>

        <Card className="bg-white/5 border-white/10 backdrop-blur-sm max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <DollarSign className="mr-2 h-6 w-6 text-dark-purple" />
              Or Buy a Custom Amount
            </CardTitle>
            <CardDescription className="text-gray-400">
              Need a different amount? Get exactly what you need. (1 USD = 1 Credit)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <Label htmlFor="custom-amount" className="sr-only">Amount (USD)</Label>
                <Input
                  id="custom-amount"
                  type="number"
                  placeholder="Enter USD amount"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  min="1"
                  step="1"
                  className="bg-black/20 border-white/20 text-white placeholder-gray-500 h-12 text-lg"
                />
              </div>
              <Button onClick={handleCustomPurchase} disabled={!customAmount || processing} className="bg-dark-purple hover:bg-opacity-90 font-bold py-3 text-lg h-12">
                Purchase Credits
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <PaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        title="Confirm Your Purchase"
        description={`You are about to purchase ${selectedPackage?.credits} credits for $${selectedPackage?.amount}.`}
        amount={selectedPackage?.amount || 0}
        credits={selectedPackage?.credits || 0}
        onConfirm={processPayment}
        processing={processing}
        type="credits"
      />
    </>
  );
};

export default Credits;
