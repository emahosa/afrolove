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
import { useFlutterwave } from '@/hooks/useFlutterwave';
import { startPaystackPayment } from '@/lib/paystack';
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
  stripe_price_id: string;
  stripePriceId?: string; // For backward compatibility
}

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  currency: string;
  popular: boolean;
  active: boolean;
  description?: string;
}

const Billing: React.FC = () => {
  const { user } = useAuth();
  const { data: paymentSettings, isLoading: isLoadingPaymentSettings } = usePaymentGatewaySettings();
  const { data: publicKeys, isLoading: isLoadingPublicKeys } = usePaymentPublicKeys();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [creditPackages, setCreditPackages] = useState<CreditPackage[]>([]);
  const [loadingCreditPackages, setLoadingCreditPackages] = useState(true);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const { trackActivity } = useAffiliateTracking();
  const { payWithFlutterwave } = useFlutterwave({
    onSuccess: (transaction) => {
      toast.success("Payment successful!", {
        description: `Transaction ID: ${transaction.id}. Your account will be updated shortly.`
      });
      // Fulfillment is handled by the webhook.
    },
    onClose: () => {
      toast.info("Payment canceled or modal closed.");
    }
  });

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
        const transformedPlans = (data || []).map(plan => ({
          ...plan,
          stripePriceId: plan.stripe_price_id
        }));
        setPlans(transformedPlans);
      }
      setLoadingPlans(false);
    };

    const fetchCreditPackages = async () => {
      setLoadingCreditPackages(true);
      try {
        // Since credit_packages table exists but may not be in types, use direct SQL
        const { data, error } = await supabase
          .from('credit_packages' as any)
          .select('*')
          .eq('active', true)
          .order('credits', { ascending: true });
        
        if (error) throw error;
        
        // Apply currency conversion logic: 1 credit = 0.02 USD
        const packagesWithConversion = (data || []).map((pkg: any) => ({
          id: pkg.id,
          name: pkg.name,
          credits: pkg.credits,
          price: pkg.credits * 0.02, // Currency conversion: 0.02 USD per credit
          currency: 'USD',
          popular: pkg.popular || false,
          active: pkg.active,
          description: pkg.description
        }));
        setCreditPackages(packagesWithConversion);
      } catch (error) {
        console.error("Error fetching credit packages:", error);
        // Fallback to hardcoded packages with currency conversion
        const fallbackPackages = [
          { id: '1', name: '5 Credits', credits: 5, price: 5 * 0.02, currency: 'USD', popular: false, active: true },
          { id: '2', name: '15 Credits', credits: 15, price: 15 * 0.02, currency: 'USD', popular: false, active: true },
          { id: '3', 'name': '50 Credits', credits: 50, price: 50 * 0.02, currency: 'USD', popular: true, active: true },
          { id: '4', name: '100 Credits', credits: 100, price: 100 * 0.02, currency: 'USD', popular: false, active: true },
        ];
        setCreditPackages(fallbackPackages);
      }
      setLoadingCreditPackages(false);
    };

    fetchUserProfile();
    fetchPlans();
    fetchCreditPackages();
    
    const plansChannel = supabase.channel('public:plans')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'plans' }, () => {
        fetchPlans();
      })
      .subscribe();

    const creditPackagesChannel = supabase.channel('public:credit_packages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'credit_packages' }, () => {
        fetchCreditPackages();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(plansChannel);
      supabase.removeChannel(creditPackagesChannel);
    };
  }, [user]);

  // Credit packages are now fetched from database and loaded in useEffect

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
    // Static message as requested by user
    toast.info("Not available", {
      description: "Subscription downgrades are currently not available. Please contact support for assistance."
    });
    setDowngradeConfirmationOpen(false);
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
      } else if (paymentSettings?.enabled && paymentSettings?.activeGateway === 'flutterwave') {
        if (!publicKeys?.flutterwavePublicKey) {
          toast.error("Flutterwave public key not found. Cannot proceed with payment.");
          setPaymentProcessing(false);
          return;
        }
        
        console.log('🔄 Starting Flutterwave subscription process for plan:', plan.name);
        console.log('📋 User details:', { userId: user.id, email: user.email, planId: plan.id });
        
        // Ensure we have proper customer information
        const customerName = user.user_metadata?.full_name || user.name || 'Valued Customer';
        const customerPhone = user.user_metadata?.phone || user.user_metadata?.phone_number || '';
        
        const flutterwavePayload = {
          publicKey: publicKeys.flutterwavePublicKey,
          amount: plan.price,
          currency: plan.currency || 'USD',
          payment_options: "card, mobilemoney, ussd",
          customer: { 
            email: user.email!,
            name: customerName,
            phone_number: customerPhone
          },
          meta: {
            type: 'subscription',
            user_id: user.id,
            plan_id: plan.id,
            plan_name: plan.name,
            credits: plan.credits_per_month,
            user_email: user.email,
            amount: plan.price,
            description: `Subscription to ${plan.name}`
          },
          customizations: {
            title: 'Afromelody AI Subscription',
            description: `Payment for ${plan.name}`,
            logo: 'https://lovable.dev/opengraph-image-p98pqg.png'
          },
        };
        
        console.log('📤 Flutterwave payload:', flutterwavePayload);
        await payWithFlutterwave(flutterwavePayload);
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

      } else if (paymentSettings?.enabled && paymentSettings?.activeGateway === 'flutterwave') {
        if (!publicKeys?.flutterwavePublicKey) {
          toast.error("Flutterwave public key not found. Cannot proceed with payment.");
          setProcessing(false);
          return;
        }
        
        console.log('🔄 Starting Flutterwave credit purchase for package:', selectedPackage);
        console.log('📋 User details:', { userId: user.id, email: user.email, credits: selectedPackage.credits });
        
        // Ensure we have proper customer information
        const customerName = user.user_metadata?.full_name || user.name || 'Valued Customer';
        const customerPhone = user.user_metadata?.phone || user.user_metadata?.phone_number || '';
        
        const flutterwavePayload = {
          publicKey: publicKeys.flutterwavePublicKey,
          amount: selectedPackage.amount,
          currency: 'USD',
          payment_options: "card, mobilemoney, ussd, bank_transfer",
          customer: { 
            email: user.email!,
            name: customerName,
            phone_number: customerPhone
          },
          meta: {
            type: 'credits',
            user_id: user.id,
            credits: selectedPackage.credits,
            user_email: user.email,
            amount: selectedPackage.amount,
            description: `Purchase of ${selectedPackage.credits} credits`
          },
          customizations: {
            title: 'Afromelody AI Credits',
            description: `Purchase of ${selectedPackage.credits} credits`,
            logo: 'https://lovable.dev/opengraph-image-p98pqg.png'
          },
        };
        
        console.log('📤 Flutterwave payload:', flutterwavePayload);
        await payWithFlutterwave(flutterwavePayload);
        setPaymentDialogOpen(false);

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
    (paymentSettings.activeGateway === 'stripe' && publicKeys?.stripePublicKey) ||
    (paymentSettings.activeGateway === 'flutterwave' && publicKeys?.flutterwavePublicKey)
  );

  const getButtonText = (plan: Plan) => {
    if (!currentUserPlan) return 'Subscribe Now';
    if (plan.id === currentUserPlan.id) return 'Current Plan';
    if (plan.rank > currentUserPlan.rank) {
      const gateway = paymentSettings?.activeGateway ? paymentSettings.activeGateway.charAt(0).toUpperCase() + paymentSettings.activeGateway.slice(1) : 'Stripe';
      return `Upgrade with ${gateway}`;
    }
    return 'Downgrade';
  };

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 text-white">
      <Tabs defaultValue="plans" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-black/30 border border-white/10">
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
              plans.map((plan) => (
                <Card key={plan.id} className="flex flex-col bg-black/20 border-white/10 hover:border-dark-purple transition-colors duration-300">
                  <CardHeader>
                    <CardTitle className="text-white">{plan.name}</CardTitle>
                    <CardDescription className="text-dark-purple">{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <ul className="space-y-2 text-sm text-gray-300">{plan.features.map(f => <li key={f} className="flex items-start"><CheckCircle className="h-5 w-5 mr-2 text-dark-purple flex-shrink-0 mt-0.5" /><span>{f}</span></li>)}</ul>
                  </CardContent>
                  <CardFooter>
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
                  </CardFooter>
                </Card>
              )))}
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
          {loadingCreditPackages ? (
            <div className="text-center text-gray-400">Loading credit packages...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {creditPackages.map((pkg) => (
                <Card key={pkg.id} className={`relative bg-black/20 border-white/10 ${pkg.popular ? 'border-dark-purple shadow-lg' : ''}`}>
                  {pkg.popular && <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-dark-purple text-white">Most Popular</Badge>}
                  <CardHeader className="text-center">
                    <CardTitle className="flex items-center justify-center text-white">
                      <Zap className="mr-2 h-5 w-5 text-dark-purple" />{pkg.credits} Credits
                    </CardTitle>
                    <CardDescription>
                      <span className="text-2xl font-bold text-dark-purple">${pkg.price.toFixed(2)}</span>
                      <div className="text-xs text-gray-400 mt-1">({pkg.credits} × $0.02 per credit)</div>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-center">
                    <p className="text-sm text-gray-400 mb-4">{pkg.description || 'Perfect for your music creation needs'}</p>
                    <Button
                      onClick={() => { setSelectedPackage({ credits: pkg.credits, amount: pkg.price }); setPaymentDialogOpen(true); }}
                      className="w-full"
                      variant={pkg.popular ? "default" : "outline"}
                      disabled={isLoadingPaymentSettings || isLoadingPublicKeys || !paymentReady}
                    >
                      {isLoadingPaymentSettings || isLoadingPublicKeys
                        ? 'Loading...'
                        : !paymentReady
                        ? 'Payments Disabled'
                        : `Purchase with ${paymentSettings?.activeGateway ? paymentSettings.activeGateway.charAt(0).toUpperCase() + paymentSettings.activeGateway.slice(1) : ''}`}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center text-white"><DollarSign className="mr-2 h-5 w-5 text-dark-purple" />Custom Amount</CardTitle>
              <CardDescription className="text-gray-400">Purchase any amount of credits ($0.02 per credit)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <Label htmlFor="custom-amount" className="text-gray-300">Amount (USD)</Label>
                  <Input id="custom-amount" type="number" placeholder="Enter amount" value={customAmount} onChange={(e) => setCustomAmount(e.target.value)} min="0.02" step="0.02" className="bg-black/20 border-white/20 text-white placeholder-gray-500"/>
                </div>
                <Button
                  onClick={() => { 
                    const amount = parseFloat(customAmount); 
                    if (!isNaN(amount) && amount >= 0.02) { 
                      const credits = Math.floor(amount / 0.02); // Calculate credits based on $0.02 per credit
                      setSelectedPackage({ credits: credits, amount: credits * 0.02 }); 
                      setPaymentDialogOpen(true); 
                    } else { 
                      toast.error('Please enter a valid amount (minimum $0.02)'); 
                    } 
                  }}
                  disabled={!customAmount || isLoadingPaymentSettings || isLoadingPublicKeys || !paymentReady}
                  className="bg-dark-purple hover:bg-opacity-90 font-bold"
                >
                  {isLoadingPaymentSettings || isLoadingPublicKeys
                    ? 'Loading...'
                    : !paymentReady
                    ? 'Payments Disabled'
                    : `Purchase with ${paymentSettings?.activeGateway ? paymentSettings.activeGateway.charAt(0).toUpperCase() + paymentSettings.activeGateway.slice(1) : ''}`}
                </Button>
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

export default Billing;