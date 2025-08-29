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
import { useAffiliateTracking } from '@/hooks/useAffiliateTracking';
import { usePaymentGatewaySettings } from '@/hooks/usePaymentGatewaySettings';
import { usePaymentPublicKeys } from '@/hooks/usePaymentPublicKeys';
import { PaystackButton } from 'react-paystack';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from 'react-router-dom';

interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: string;
  description: string;
  paystack_plan_code: string;
  credits_per_month: number;
  features: string[];
  rank: number;
  stripePriceId: string;
}

const Billing: React.FC = () => {
  const { user } = useAuth();
  const { data: paymentSettings, isLoading: isLoadingPaymentSettings } = usePaymentGatewaySettings();
  const { data: publicKeys, isLoading: isLoadingPublicKeys } = usePaymentPublicKeys();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [customAmount, setCustomAmount] = useState('');
  const { trackActivity } = useAffiliateTracking();

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

    const fetchPlans = async () => {
      setLoadingPlans(true);
      const { data, error } = await supabase.from("plans").select("*").order('rank', { ascending: true });
      if (error) {
        console.error("Error fetching plans:", error);
        toast.error("Could not load subscription plans.");
      } else {
        setPlans(data || []);
      }
      setLoadingPlans(false);
    };

    fetchUserProfile();
    fetchPlans();
  }, [user]);

  const creditPackages = [
    { credits: 5, amount: 5, popular: false },
    { credits: 15, amount: 10, popular: false },
    { credits: 50, amount: 25, popular: true },
    { credits: 100,. amount: 45, popular: false },
  ];

  const handleSubscriptionChange = async (planId: string) => {
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;

    const currentUserPlan = user?.subscription?.planId
      ? plans.find(p => p.id === user.subscription.planId)
      : null;

    const isDowngrade = currentUserPlan && plan.rank < currentUserPlan.rank;

    if (isDowngrade) {
      setDowngradeConfirmationOpen(true);
    } else {
      setDialogOpen(true);
    }
  };

  const confirmDowngrade = async () => {
    if (!selectedPlanId) return;
    const plan = plans.find(p => p.id === selectedPlanId);
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
    } catch (error: any) {
      toast.error("Failed to schedule downgrade", { description: error.message });
    } finally {
      setPaymentProcessing(false);
      setDowngradeConfirmationOpen(false);
    }
  };

  const confirmUpgradeOrSub = async () => {
    if (!selectedPlanId) return;
    const plan = plans.find(p => p.id === selectedPlanId);
    if (!plan) return;

    setPaymentProcessing(true);
    try {
      if (paymentSettings?.enabled && paymentSettings?.activeGateway === 'stripe') {
        console.log('🔄 Starting Stripe subscription process for plan:', plan.name);
        const { data, error } = await supabase.functions.invoke('create-subscription', {
          body: {
            paystackPlanCode: plan.paystack_plan_code,
            priceId: plan.stripePriceId,
            planId: plan.id,
            planName: plan.name,
            amount: Math.round(plan.price * 100),
            credits: plan.credits_per_month,
          }
        });
        if (error) throw new Error(error.message || 'Failed to create subscription session.');
        if (!data?.url) throw new Error('Payment processor did not return a valid checkout URL.');
        await trackActivity('subscription_page_visit', {
          plan_id: plan.id,
          plan_name: plan.name,
          amount: plan.price
        });
        window.location.href = data.url;
      } else {
        toast.error("Payment processing is currently disabled or no gateway is configured.");
        console.warn("Payment settings state:", paymentSettings);
      }
    } catch (error: any) {
      console.error('💥 Subscription process failed:', error);
      toast.error("Subscription failed", {
        description: error.message || "There was an error processing your subscription. Please try again.",
      });
    } finally {
      setPaymentProcessing(false);
      setDialogOpen(false);
    }
  };

  const selectedPlanDetails = plans.find(p => p.id === selectedPlanId);
  const currentUserPlan = user?.subscription?.planId ? plans.find(p => p.id === user.subscription.planId) : null;

  const paymentReady = paymentSettings?.enabled && (
    (paymentSettings.activeGateway === 'paystack' && publicKeys?.paystackPublicKey) ||
    (paymentSettings.activeGateway === 'stripe' && publicKeys?.stripePublicKey)
  );

  const getButtonText = (plan: Plan) => {
    if (!currentUserPlan) return 'Subscribe Now';
    if (plan.id === currentUserPlan.id) return 'Current Plan';
    if (plan.rank > currentUserPlan.rank) {
      return 'Upgrade';
    }
    return 'Downgrade';
  };

  const getPaystackSubProps = (plan: Plan) => {
    if (!user || !publicKeys?.paystackPublicKey) return null;
    return {
      email: user.email!,
      amount: plan.price * 100, // in Kobo
      publicKey: publicKeys.paystackPublicKey,
      reference: `txn_sub_${user.id}_${Date.now()}`,
      onSuccess: async (transaction: { reference: string }) => {
        toast.success("Payment successful! Verifying subscription...", {
          description: `Reference: ${transaction.reference}. Your plan will be updated shortly.`
        });
        await supabase.functions.invoke('verify-paystack-transaction', {
          body: { reference: transaction.reference, type: 'subscription', planId: plan.id }
        });
      },
      onClose: () => {
        toast.info("Payment canceled.");
      },
    };
  };

  const getCreditPurchaseProps = (pkg: { credits: number, amount: number }) => {
    if (!user || !publicKeys?.paystackPublicKey) return null;
    return {
      email: user.email!,
      amount: pkg.amount * 100, // in Kobo
      publicKey: publicKeys.paystackPublicKey,
      reference: `txn_credits_${user.id}_${Date.now()}`,
      onSuccess: async (transaction: { reference: string }) => {
        toast.success("Payment successful! Verifying...", {
          description: `Reference: ${transaction.reference}. Credits will be added shortly.`
        });
        await supabase.functions.invoke('verify-paystack-transaction', {
          body: { reference: transaction.reference, type: 'credits', credits: pkg.credits }
        });
      },
      onClose: () => {
        toast.info("Payment canceled.");
      },
    };
  };

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 text-white">
      <Tabs defaultValue="plans" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-black/30 border-white/10">
          <TabsTrigger value="plans" className="data-[state=active]:bg-dark-purple data-[state=active]:text-white">Subscription Plans</TabsTrigger>
          <TabsTrigger value="credits" className="data-[state=active]:bg-dark-purple data-[state=active]:text-white">Buy Credits</TabsTrigger>
        </TabsList>
        <TabsContent value="plans" className="mt-6">
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="text-white">Plans</CardTitle>
                <CardDescription className="text-gray-400">Choose a plan that fits your needs.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {loadingPlans ? (
                <p className="text-center col-span-3">Loading plans...</p>
              ) : (
              plans.map((plan) => {
                const paystackSubProps = getPaystackSubProps(plan);
                return (
                  <Card key={plan.id} className="flex flex-col bg-black/20 border-white/10 hover:border-dark-purple transition-colors duration-300">
                    <CardHeader>
                      <CardTitle className="text-white">{plan.name}</CardTitle>
                      <CardDescription className="text-dark-purple">{plan.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow">
                      <ul className="space-y-2 text-sm text-gray-300">{plan.features.map(f => <li key={f} className="flex items-start"><CheckCircle className="h-5 w-5 mr-2 text-dark-purple flex-shrink-0 mt-0.5" /><span>{f}</span></li>)}</ul>
                    </CardContent>
                    <CardFooter>
                      {paymentSettings?.activeGateway === 'paystack' && paystackSubProps ? (
                        <PaystackButton
                          {...paystackSubProps}
                          text={getButtonText(plan)}
                          className="w-full bg-dark-purple hover:bg-opacity-90 font-bold py-2 px-4 rounded"
                          disabled={paymentProcessing || plan.id === currentUserPlan?.id}
                        />
                      ) : (
                        <Button
                          className="w-full bg-dark-purple hover:bg-opacity-90 font-bold"
                          onClick={() => {
                            setSelectedPlanId(plan.id);
                            handleSubscriptionChange(plan.id);
                          }}
                          disabled={paymentProcessing || plan.id === currentUserPlan?.id}
                        >
                          {getButtonText(plan)}
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                )
              }))}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="credits" className="mt-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight mb-2 text-white">Buy Credits</h1>
            <p className="text-gray-400">Purchase credits to generate amazing songs with AI</p>
          </div>
          <Card className="mb-8 bg-white/5 border-white/10 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center text-white"><Coins className="mr-2 h-5 w-5 text-dark-purple" />Your Credits</CardTitle>
              <CardDescription className="text-gray-400">Use credits to generate songs, create custom tracks, and more</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="text-3xl font-bold text-dark-purple">{userProfile?.credits || 0}</div>
                  <div className="text-sm text-gray-400">credits available</div>
                </div>
                <Badge variant="outline" className="text-sm border-white/20 text-gray-300">20 credits = 1 song generation</Badge>
              </div>
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {creditPackages.map((pkg, index) => {
              const creditPurchaseProps = getCreditPurchaseProps(pkg);
              return (
                <Card key={index} className={`relative bg-black/20 border-white/10 ${pkg.popular ? 'border-dark-purple shadow-lg' : ''}`}>
                  {pkg.popular && <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-dark-purple text-white">Most Popular</Badge>}
                  <CardHeader className="text-center">
                    <CardTitle className="flex items-center justify-center text-white"><Zap className="mr-2 h-5 w-5 text-dark-purple" />{pkg.credits} Credits</CardTitle>
                    <CardDescription><span className="text-2xl font-bold text-dark-purple">${pkg.amount}</span></CardDescription>
                  </CardHeader>
                  <CardContent className="text-center">
                    <div className="text-sm text-gray-400 mb-4">${(pkg.amount / pkg.credits).toFixed(2)} per credit</div>
                    {isLoadingPaymentSettings || isLoadingPublicKeys ? (
                      <Button disabled className="w-full">Loading...</Button>
                    ) : !paymentReady || !creditPurchaseProps ? (
                      <Button disabled className="w-full">Payments Disabled</Button>
                    ) : (
                      <PaystackButton
                        {...creditPurchaseProps}
                        text="Purchase"
                        className="w-full bg-white text-black hover:bg-gray-200 font-bold py-2 px-4 rounded"
                      />
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center text-white"><DollarSign className="mr-2 h-5 w-5 text-dark-purple" />Custom Amount</CardTitle>
              <CardDescription className="text-gray-400">Purchase any amount of credits (1 USD = 1 Credit)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <Label htmlFor="custom-amount" className="text-gray-300">Amount (USD)</Label>
                  <Input id="custom-amount" type="number" placeholder="Enter amount" value={customAmount} onChange={(e) => setCustomAmount(e.target.value)} min="1" step="1" className="bg-black/20 border-white/20 text-white placeholder-gray-500"/>
                </div>
                {(() => {
                  const amount = parseFloat(customAmount);
                  if (isNaN(amount) || amount < 1) {
                    return <Button disabled className="bg-dark-purple hover:bg-opacity-90 font-bold">Purchase</Button>;
                  }
                  const customAmountProps = getCreditPurchaseProps({ credits: Math.floor(amount), amount: amount });
                  if (isLoadingPaymentSettings || isLoadingPublicKeys) {
                    return <Button disabled className="w-full">Loading...</Button>;
                  }
                  if (!paymentReady || !customAmountProps) {
                    return <Button disabled className="w-full">Payments Disabled</Button>;
                  }
                  return (
                    <PaystackButton
                      {...customAmountProps}
                      text="Purchase"
                      className="bg-dark-purple hover:bg-opacity-90 font-bold py-2 px-4 rounded"
                    />
                  );
                })()}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={downgradeConfirmationOpen} onOpenChange={setDowngradeConfirmationOpen}>
        <AlertDialogContent className="bg-gray-900 border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Downgrade</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Your subscription will be changed to the {selectedPlanDetails?.name} plan at the end of your current billing cycle. You will not be charged today.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-white/30 hover:bg-white/10">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDowngrade} disabled={paymentProcessing} className="bg-dark-purple hover:bg-opacity-90 font-bold">
              {paymentProcessing ? "Processing..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Billing;
