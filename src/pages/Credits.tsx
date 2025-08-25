import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Coins, DollarSign, Zap, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import PaymentDialog from '@/components/payment/PaymentDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from 'react-router-dom';

const subscriptionPlansData = [
  {
    id: "basic_monthly",
    name: "Basic",
    price: 9.99,
    priceId: "price_basic_monthly",
    stripePriceId: "your_stripe_price_id_for_basic", // Replace with actual Stripe Price ID
    currency: "USD",
    interval: "month",
    description: "$9.99/month",
    creditsPerMonth: 20,
    rank: 1,
    features: [
      "20 credits monthly",
      "Access to all basic AI models",
      "Standard quality exports",
      "Email support",
    ],
  },
  {
    id: "premium_monthly",
    name: "Premium",
    price: 19.99,
    priceId: "price_premium_monthly",
    stripePriceId: "your_stripe_price_id_for_premium", // Replace with actual Stripe Price ID
    currency: "USD",
    interval: "month",
    description: "$19.99/month",
    creditsPerMonth: 75,
    rank: 2,
    features: [
      "75 credits monthly",
      "Access to all premium AI models",
      "High quality exports",
      "Priority email support",
      "Unlimited song storage",
    ],
  },
  {
    id: "professional_monthly",
    name: "Professional",
    price: 39.99,
    priceId: "price_professional_monthly",
    stripePriceId: "your_stripe_price_id_for_professional", // Replace with actual Stripe Price ID
    currency: "USD",
    interval: "month",
    description: "$39.99/month",
    creditsPerMonth: 200,
    rank: 3,
    features: [
      "200 credits monthly",
      "Access to all AI models including beta",
      "Maximum quality exports",
      "Priority support with 24hr response",
      "Unlimited song storage",
      "Commercial usage rights",
      "Advanced editing tools",
    ],
  },
];

const Credits: React.FC = () => {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [processing, setProcessing] = useState(false);

  // State for subscriptions
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [downgradeConfirmationOpen, setDowngradeConfirmationOpen] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) return;
      const { data, error } = await supabase.from('profiles').select('credits').eq('id', user.id).single();
      if (!error && data) setUserProfile(data);
    };
    fetchUserProfile();
  }, [user]);

  const creditPackages = [
    { credits: 5, amount: 5, popular: false },
    { credits: 15, amount: 10, popular: false },
    { credits: 50, amount: 25, popular: true },
    { credits: 100, amount: 45, popular: false },
  ];

  const handlePurchase = async (pkg: any) => {
    // ... (same as before)
  };

  const handleCustomPurchase = async () => {
    // ... (same as before)
  };

  const processPayment = async () => {
    // ... (same as before)
  };

  const handleSubscriptionChange = async (planId: string) => {
    const plan = subscriptionPlansData.find(p => p.id === planId);
    if (!plan) return;

    const currentUserPlan = user?.subscription?.planId
      ? subscriptionPlansData.find(p => p.id === user.subscription.planId)
      : null;

    const isDowngrade = currentUserPlan && plan.rank < currentUserPlan.rank;

    if (isDowngrade) {
      setDowngradeConfirmationOpen(true);
    } else {
      // This handles new subscriptions and upgrades
      setDialogOpen(true);
    }
  };

  const confirmDowngrade = async () => {
    if (!selectedPlanId) return;
    const plan = subscriptionPlansData.find(p => p.id === selectedPlanId);
    if (!plan) return;

    setPaymentProcessing(true);
    try {
      const { error } = await supabase.functions.invoke('manage-subscription', {
        body: {
          action: 'downgrade',
          newPlanId: plan.id,
          newStripePriceId: plan.stripePriceId,
        }
      });

      if (error) throw new Error(error.message);

      toast.success("Downgrade Scheduled", {
        description: `Your subscription will be changed to the ${plan.name} plan at the end of your current billing cycle.`
      });
      // Optionally, refresh user data here to show the pending change
    } catch (error: any) {
      toast.error("Failed to schedule downgrade", { description: error.message });
    } finally {
      setPaymentProcessing(false);
      setDowngradeConfirmationOpen(false);
    }
  };

  const confirmUpgradeOrSub = async () => {
    if (!selectedPlanId) return;
    const plan = subscriptionPlansData.find(p => p.id === selectedPlanId);
    if (!plan) return;

    setPaymentProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-subscription', {
        body: {
          priceId: plan.priceId,
          planId: plan.id,
          planName: plan.name,
          amount: Math.round(plan.price * 100),
          credits: plan.creditsPerMonth,
        }
      });

      if (error) throw new Error(error.message);

      if (data?.success) {
        toast.success("Subscription Activated!", { description: `Your ${plan.name} plan is now active.` });
        window.location.href = '/dashboard';
      } else if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      toast.error("Subscription failed", { description: error.message });
    } finally {
      setPaymentProcessing(false);
      setDialogOpen(false);
    }
  };

  const selectedPlanDetails = subscriptionPlansData.find(p => p.id === selectedPlanId);
  const currentUserPlan = user?.subscription?.planId ? subscriptionPlansData.find(p => p.id === user.subscription.planId) : null;

  const getButtonText = (plan: typeof subscriptionPlansData[0]) => {
    if (!currentUserPlan) return 'Subscribe Now';
    if (plan.id === currentUserPlan.id) return 'Current Plan';
    if (plan.rank > currentUserPlan.rank) return 'Upgrade';
    return 'Downgrade';
  };

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <Tabs defaultValue="plans" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="plans">Subscription Plans</TabsTrigger>
          <TabsTrigger value="credits">Buy Credits</TabsTrigger>
        </TabsList>
        <TabsContent value="plans">
          <Card className="shadow-lg border-none mt-4">
            <CardHeader>
                <CardTitle>Plans</CardTitle>
                <CardDescription>Choose a plan that fits your needs.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {subscriptionPlansData.map((plan) => (
                <Card key={plan.id}>
                  <CardHeader>
                    <CardTitle>{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul>{plan.features.map(f => <li key={f}>{f}</li>)}</ul>
                  </CardContent>
                  <CardFooter>
                    <Button
                      className="w-full"
                      onClick={() => {
                        setSelectedPlanId(plan.id);
                        handleSubscriptionChange(plan.id);
                      }}
                      disabled={paymentProcessing || plan.id === currentUserPlan?.id}
                    >
                      {getButtonText(plan)}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="credits">
          <div className="mb-8 mt-4">
            <h1 className="text-3xl font-bold tracking-tight mb-2">Buy Credits</h1>
            <p className="text-muted-foreground">Purchase credits to generate amazing songs with AI</p>
          </div>
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center"><Coins className="mr-2 h-5 w-5" />Your Credits</CardTitle>
              <CardDescription>Use credits to generate songs, create custom tracks, and more</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="text-3xl font-bold text-primary">{userProfile?.credits || 0}</div>
                  <div className="text-sm text-muted-foreground">credits available</div>
                </div>
                <Badge variant="outline" className="text-sm">20 credits = 1 song generation</Badge>
              </div>
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {creditPackages.map((pkg, index) => (
              <Card key={index} className={`relative ${pkg.popular ? 'border-primary shadow-lg' : ''}`}>
                {pkg.popular && <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2">Most Popular</Badge>}
                <CardHeader className="text-center">
                  <CardTitle className="flex items-center justify-center"><Zap className="mr-2 h-5 w-5" />{pkg.credits} Credits</CardTitle>
                  <CardDescription><span className="text-2xl font-bold text-primary">${pkg.amount}</span></CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="text-sm text-muted-foreground mb-4">${(pkg.amount / pkg.credits).toFixed(2)} per credit</div>
                  <Button onClick={() => { setSelectedPackage(pkg); setPaymentDialogOpen(true); }} className="w-full" variant={pkg.popular ? "default" : "outline"}>Purchase Now</Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><DollarSign className="mr-2 h-5 w-5" />Custom Amount</CardTitle>
              <CardDescription>Purchase any amount of credits (1 USD = 1 Credit)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <Label htmlFor="custom-amount">Amount (USD)</Label>
                  <Input id="custom-amount" type="number" placeholder="Enter amount" value={customAmount} onChange={(e) => setCustomAmount(e.target.value)} min="1" step="1" />
                </div>
                <Button onClick={() => { const amount = parseFloat(customAmount); if (!isNaN(amount) && amount >= 1) { setSelectedPackage({ credits: Math.floor(amount), amount: amount }); setPaymentDialogOpen(true); } else { toast.error('Please enter a valid amount'); } }} disabled={!customAmount}>Purchase</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <PaymentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={
          currentUserPlan
            ? `Upgrade to ${selectedPlanDetails?.name}`
            : `Subscribe to ${selectedPlanDetails?.name}`
        }
        description={`You are about to change your subscription to the ${selectedPlanDetails?.name} plan for ${selectedPlanDetails?.description}.`}
        amount={selectedPlanDetails?.price || 0}
        onConfirm={confirmUpgradeOrSub}
        processing={paymentProcessing}
        type="subscription"
      />

      <AlertDialog open={downgradeConfirmationOpen} onOpenChange={setDowngradeConfirmationOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Downgrade</AlertDialogTitle>
            <AlertDialogDescription>
              Your subscription will be changed to the {selectedPlanDetails?.name} plan at the end of your current billing cycle. You will not be charged today.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDowngrade} disabled={paymentProcessing}>
              {paymentProcessing ? "Processing..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
