
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Coins, DollarSign, Zap, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import PaymentDialog from '@/components/payment/PaymentDialog';
import { useAffiliateTracking } from '@/hooks/useAffiliateTracking';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from 'react-router-dom';

const subscriptionPlansData = [
  {
    id: "basic_monthly",
    name: "Basic",
    price: 9.99,
    priceId: "price_basic_monthly",
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
  console.log('Credits page user object:', user);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const { trackActivity } = useAffiliateTracking();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', user.id)
        .single();

      if (!error && data) {
        setUserProfile(data);
      }
    };

    fetchUserProfile();
  }, [user]);

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

  const handleSubscribe = async (planId: string) => {
    if (!user) {
      toast.error("Please log in to subscribe.");
      return;
    }

    setPaymentProcessing(true);
    try {
      const plan = subscriptionPlansData.find(p => p.id === planId);
      if (!plan) {
        throw new Error("Selected plan not found.");
      }

      const { data, error } = await supabase.functions.invoke('create-subscription', {
        body: {
          priceId: plan.priceId,
          planId: plan.id,
          planName: plan.name,
          amount: Math.round(plan.price * 100),
          credits: plan.creditsPerMonth,
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to create subscription session.');
      }

      if (data?.success) {
        toast.success("Subscription Activated!", {
          description: `Your ${plan.name} subscription has been activated successfully.`
        });
        window.location.href = '/dashboard';
      } else if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No response received from subscription processor.');
      }

      setDialogOpen(false);
    } catch (error: any) {
      console.error("Error subscribing:", error);
      toast.error("Subscription failed", {
        description: error.message || "There was an error processing your subscription. Please try again.",
      });
    } finally {
      setPaymentProcessing(false);
    }
  };

  const selectedPlanDetails = subscriptionPlansData.find(p => p.id === selectedPlanId);

  const currentUserPlan = user?.subscription?.planId
    ? subscriptionPlansData.find(p => p.id === user.subscription.planId)
    : null;

  const getButtonText = (plan: typeof subscriptionPlansData[0]) => {
    if (!currentUserPlan) {
      return 'Subscribe Now';
    }
    if (plan.id === currentUserPlan.id) {
      return 'Current Plan';
    }
    if (plan.rank > currentUserPlan.rank) {
      return 'Upgrade';
    }
    if (plan.rank < currentUserPlan.rank) {
      return 'Downgrade';
    }
    return 'Subscribe Now';
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
            <CardHeader className="text-center px-6 py-8 bg-gradient-to-br from-primary to-primary/80 rounded-t-lg">
              <CardTitle className="text-4xl font-extrabold tracking-tight text-primary-foreground">Unlock Your Full Potential</CardTitle>
              <CardDescription className="text-xl text-primary-foreground/90 mt-2">
                Choose a plan that fits your creative needs and access all premium features.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 md:p-10 space-y-10">
              <div className="text-center">
                <p className="text-lg text-muted-foreground">
                  Our subscription plans give you unlimited access to music generation, your full song library, credit purchases, and much more!
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {subscriptionPlansData.map((plan) => (
                  <Card key={plan.id} className="flex flex-col shadow-md hover:shadow-xl transition-shadow duration-300">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-2xl font-semibold">{plan.name}</CardTitle>
                      <CardDescription className="text-lg font-medium text-primary">{plan.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow space-y-4">
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="flex items-start">
                            <CheckCircle className="h-5 w-5 mr-2 text-green-500 flex-shrink-0 mt-0.5" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                    <CardFooter className="mt-auto pt-6">
                      <Button
                        className="w-full text-lg py-3"
                        onClick={() => {
                          setSelectedPlanId(plan.id);
                          setDialogOpen(true);
                        }}
                        disabled={paymentProcessing || !user || plan.id === currentUserPlan?.id}
                      >
                        {getButtonText(plan)}
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col items-center text-center p-6 bg-muted/50 rounded-b-lg">
              <p className="text-sm text-muted-foreground mb-4">
                By subscribing, you agree to our <Link to="/terms" className="underline hover:text-primary">Terms of Service</Link> and <Link to="/privacy" className="underline hover:text-primary">Privacy Policy</Link>.
              </p>
              <Link to="/dashboard">
                <Button variant="ghost" className="text-muted-foreground hover:text-primary">Maybe Later</Button>
              </Link>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="credits">
          <div className="mb-8 mt-4">
            <h1 className="text-3xl font-bold tracking-tight mb-2">Buy Credits</h1>
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
                    {userProfile?.credits || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    credits available
                  </div>
                </div>
                <Badge variant="outline" className="text-sm">
                  20 credits = 1 song generation
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
        </TabsContent>
      </Tabs>

      <PaymentDialog
        open={dialogOpen && selectedPlanId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedPlanId(null);
          setDialogOpen(open);
        }}
        title={
          currentUserPlan
            ? (selectedPlanDetails?.rank || 0) > currentUserPlan.rank ? `Upgrade to ${selectedPlanDetails?.name}` : `Downgrade to ${selectedPlanDetails?.name}`
            : `Subscribe to ${selectedPlanDetails?.name}`
        }
        description={`You are about to change your subscription to the ${selectedPlanDetails?.name} plan for ${selectedPlanDetails?.description}.`}
        amount={selectedPlanDetails?.price || 0}
        onConfirm={() => selectedPlanId && handleSubscribe(selectedPlanId)}
        processing={paymentProcessing}
        type="subscription"
      />

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
