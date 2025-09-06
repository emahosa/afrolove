import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
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
import { startPaystackPayment } from '@/lib/paystack';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from 'react-router-dom';
import Layout from '@/components/Layout';

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
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [processing, setProcessing] = useState(false);
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
    { credits: 100, amount: 45, popular: false },
  ];

  const handlePurchase = async (pkg: any) => {
    // ... (same as before)
  };

  const handleCustomPurchase = async () => {
    // ... (same as before)
  };

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
      // This handles new subscriptions and upgrades
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
    const plan = plans.find(p => p.id === selectedPlanId);
    if (!plan) return;

    setPaymentProcessing(true);
    try {
      if (paymentSettings?.enabled && paymentSettings?.activeGateway === 'paystack') {
        if (!publicKeys?.paystackPublicKey) {
          toast.error("Paystack public key not found. Cannot proceed with payment.");
          setPaymentProcessing(false);
          return;
        }
        const reference = `txn_sub_${user.id}_${Date.now()}`;
        await startPaystackPayment({
          publicKey: publicKeys.paystackPublicKey,
          email: user.email!,
          amount: plan.price,
          reference: reference,
          metadata: {
            user_id: user.id,
            type: 'subscription',
            plan_id: plan.id,
            plan_name: plan.name,
            credits: plan.credits_per_month,
          },
          onSuccess: (ref: string) => {
            toast.success("Payment successful!", {
              description: `Reference: ${ref}. Your account will be updated shortly.`
            });
            // Fulfillment is handled by the webhook.
          },
          onCancel: () => {
            toast.info("Payment canceled.");
          },
        });

      } else if (paymentSettings?.enabled && paymentSettings?.activeGateway === 'stripe') {
        console.log('🔄 Starting Stripe subscription process for plan:', plan.name);
        
        try {
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
          
          if (error) {
            console.error('💥 Subscription creation error:', error);
            throw new Error(error.message || 'Failed to create subscription session.');
          }
          
          if (!data?.url) {
            console.error('💥 No checkout URL returned:', data);
            throw new Error('Payment processor did not return a valid checkout URL. Please check your payment gateway configuration.');
          }
          
          console.log('✅ Subscription session created, redirecting to:', data.url);
          
          await trackActivity('subscription_page_visit', {
            plan_id: plan.id,
            plan_name: plan.name,
            amount: plan.price
          });
          
          window.location.href = data.url;
          
        } catch (subscriptionError: any) {
          console.error('💥 Subscription process failed:', subscriptionError);
          toast.error("Subscription failed", {
            description: subscriptionError.message || "There was an error processing your subscription. Please try again.",
          });
          return; // Don't proceed if subscription creation failed
        }
      } else {
        toast.error("Payment processing is currently disabled or no gateway is configured.");
        console.warn("Payment settings state:", paymentSettings);
        return;
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
      if (paymentSettings?.enabled && paymentSettings?.activeGateway === 'paystack') {
        if (!publicKeys?.paystackPublicKey) {
          toast.error("Paystack public key not found. Cannot proceed with payment.");
          setProcessing(false);
          return;
        }
        const reference = `txn_credits_${user.id}_${Date.now()}`;
        await startPaystackPayment({
          publicKey: publicKeys.paystackPublicKey,
          email: user.email!,
          amount: selectedPackage.amount,
          reference: reference,
          metadata: {
            user_id: user.id,
            type: 'credits',
            credits: selectedPackage.credits,
          },
          onSuccess: (ref: string) => {
            toast.success("Payment successful!", {
              description: `Reference: ${ref}. Your credits will be added shortly.`
            });
            // Fulfillment is handled by the webhook.
          },
          onCancel: () => {
            toast.info("Payment canceled.");
          },
        });
        setPaymentDialogOpen(false);

      } else if (paymentSettings?.enabled && paymentSettings?.activeGateway === 'stripe') {
        console.log('🔄 Starting Stripe credit purchase process for package:', selectedPackage);
        trackActivity('credit_purchase_start');

        try {
          const { data, error } = await supabase.functions.invoke('create-payment', {
            body: {
              amount: Math.round(selectedPackage.amount * 100),
              credits: selectedPackage.credits,
              description: `Purchase of ${selectedPackage.credits} credits`,
              packId: `credits_${selectedPackage.credits}`,
            }
          });

          if (error) {
            console.error('💥 Payment creation error:', error);
            throw new Error(error.message || 'Failed to create payment session.');
          }
          
          if (!data?.url) {
            console.error('💥 No checkout URL returned:', data);
            throw new Error('Payment processor did not return a valid checkout URL. Please check your payment gateway configuration.');
          }

          console.log('✅ Payment session created, redirecting to:', data.url);
          await trackActivity('credit_purchase_redirect');
          window.location.href = data.url;
          setPaymentDialogOpen(false);
          
        } catch (paymentError: any) {
          console.error('💥 Payment process failed:', paymentError);
          toast.error("Purchase failed", {
            description: paymentError.message || "There was an error processing your payment. Please try again.",
          });
          trackActivity('credit_purchase_failed');
          return; // Don't proceed if payment creation failed
        }

      } else {
        toast.error("Payment processing is currently disabled or no gateway is configured.");
        console.warn("Payment settings state:", paymentSettings);
      }
    } catch (error: any) {
      console.error('💥 Payment process failed:', error);
      console.error("Error purchasing credits:", error);
      toast.error("Purchase failed", {
        description: error.message || "There was an error processing your payment. Please try again.",
      });
      trackActivity('credit_purchase_failed');
    } finally {
      setProcessing(false);
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
      const gateway = paymentSettings?.activeGateway === 'paystack' ? 'Paystack' : 'Stripe';
      return `Upgrade with ${gateway}`;
    }
    return 'Downgrade';
  };

  return (
    <Layout active="Billing">
      <Tabs defaultValue="plans" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-black/30 border border-white/10 rounded-xl">
          <TabsTrigger value="plans" className="data-[state=active]:bg-purple-600/40 data-[state=active]:text-white rounded-lg">Subscription Plans</TabsTrigger>
          <TabsTrigger value="credits" className="data-[state=active]:bg-purple-600/40 data-[state=active]:text-white rounded-lg">Buy Credits</TabsTrigger>
        </TabsList>
        <TabsContent value="plans" className="mt-6">
          <div className="glass-card p-6 rounded-2xl">
            <h2 className="text-2xl font-bold mb-2 text-white">Plans</h2>
            <p className="text-gray-400 mb-6">Choose a plan that fits your needs.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {loadingPlans ? (
                <p className="text-center col-span-3">Loading plans...</p>
              ) : (
              plans.map((plan) => (
                <div key={plan.id} className="flex flex-col glass-card p-6 rounded-2xl hover:border-purple-500/50 transition-colors duration-300">
                  <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                  <p className="text-purple-400 mb-4">{plan.description}</p>
                  <ul className="space-y-2 text-sm text-gray-300 flex-grow">{plan.features.map(f => <li key={f} className="flex items-start"><CheckCircle className="h-5 w-5 mr-2 text-purple-400 flex-shrink-0 mt-0.5" /><span>{f}</span></li>)}</ul>
                  <Button
                    className="w-full glass-btn mt-6"
                    onClick={() => {
                      setSelectedPlanId(plan.id);
                      handleSubscriptionChange(plan.id);
                    }}
                    disabled={paymentProcessing || plan.id === currentUserPlan?.id}
                  >
                    {getButtonText(plan)}
                  </Button>
                </div>
              )))}
            </div>
          </div>
        </TabsContent>
        <TabsContent value="credits" className="mt-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight mb-2 text-white">Buy Credits</h1>
            <p className="text-gray-400">Purchase credits to generate amazing songs with AI</p>
          </div>
          <div className="glass-card p-6 rounded-2xl mb-8">
            <h3 className="flex items-center text-xl font-bold text-white"><Coins className="mr-2 h-5 w-5 text-purple-400" />Your Credits</h3>
            <p className="text-gray-400 mb-4">Use credits to generate songs, create custom tracks, and more</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="text-3xl font-bold text-purple-400">{userProfile?.credits || 0}</div>
                <div className="text-sm text-gray-400">credits available</div>
              </div>
              <Badge variant="outline" className="text-sm border-purple-500/30 bg-purple-500/10 text-purple-300">20 credits = 1 song generation</Badge>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {creditPackages.map((pkg, index) => (
              <div key={index} className={`relative glass-card p-6 rounded-2xl ${pkg.popular ? 'border-purple-500/50 shadow-lg' : ''}`}>
                {pkg.popular && <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-purple-600/80 text-white border-purple-500/50">Most Popular</Badge>}
                <div className="text-center">
                  <h4 className="flex items-center justify-center text-xl font-bold text-white"><Zap className="mr-2 h-5 w-5 text-purple-400" />{pkg.credits} Credits</h4>
                  <p><span className="text-2xl font-bold text-purple-400">${pkg.amount}</span></p>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-400 mb-4">${(pkg.amount / pkg.credits).toFixed(2)} per credit</div>
                  <Button
                    onClick={() => { setSelectedPackage(pkg); setPaymentDialogOpen(true); }}
                    className="w-full glass-btn"
                    disabled={isLoadingPaymentSettings || isLoadingPublicKeys || !paymentReady}
                  >
                    {isLoadingPaymentSettings || isLoadingPublicKeys
                      ? 'Loading...'
                      : !paymentReady
                      ? 'Payments Disabled'
                      : `Purchase with ${paymentSettings.activeGateway === 'paystack' ? 'Paystack' : 'Stripe'}`}
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="glass-card p-6 rounded-2xl">
            <h4 className="flex items-center text-xl font-bold text-white"><DollarSign className="mr-2 h-5 w-5 text-purple-400" />Custom Amount</h4>
            <p className="text-gray-400 mb-4">Purchase any amount of credits (1 USD = 1 Credit)</p>
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <Label htmlFor="custom-amount" className="text-gray-300">Amount (USD)</Label>
                <Input id="custom-amount" type="number" placeholder="Enter amount" value={customAmount} onChange={(e) => setCustomAmount(e.target.value)} min="1" step="1" className="w-full p-3 rounded-xl bg-black/40 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"/>
              </div>
              <Button
                onClick={() => { const amount = parseFloat(customAmount); if (!isNaN(amount) && amount >= 1) { setSelectedPackage({ credits: Math.floor(amount), amount: amount }); setPaymentDialogOpen(true); } else { toast.error('Please enter a valid amount'); } }}
                disabled={!customAmount || isLoadingPaymentSettings || isLoadingPublicKeys || !paymentReady}
                className="glass-btn"
              >
                {isLoadingPaymentSettings || isLoadingPublicKeys
                  ? 'Loading...'
                  : !paymentReady
                  ? 'Payments Disabled'
                  : `Purchase with ${paymentSettings.activeGateway === 'paystack' ? 'Paystack' : 'Stripe'}`}
              </Button>
            </div>
          </div>
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
        <AlertDialogContent className="glass-card rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Downgrade</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              Your subscription will be changed to the {selectedPlanDetails?.name} plan at the end of your current billing cycle. You will not be charged today.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="glass-btn bg-transparent hover:bg-white/10">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDowngrade} disabled={paymentProcessing} className="glass-btn bg-purple-600/40 hover:bg-purple-600/60">
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
    </Layout>
  );
};

export default Billing;