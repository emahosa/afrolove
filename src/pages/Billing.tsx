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
import { usePaymentGatewaySettings, PaymentGatewayClientSettings } from '@/hooks/usePaymentGatewaySettings';
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
  stripePriceId: string;
}

const Billing: React.FC = () => {
  const { user } = useAuth();
  const { data: paymentSettings, isLoading: isLoadingPaymentSettings } = usePaymentGatewaySettings();
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

  const processPayment = async () => {
    if (!user || !user.email) {
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
        const paystackPublicKey = paymentSettings.mode === 'live'
          ? paymentSettings.paystack?.live?.publicKey
          : paymentSettings.paystack?.test?.publicKey;

        if (!paystackPublicKey) {
          toast.error("Paystack public key is not configured for the current mode.");
          return;
        }

        const reference = `txn_credits_${user.id}_${Date.now()}`;
        startPaystackPayment({
          publicKey: paystackPublicKey,
          email: user.email,
          amount: selectedPackage.amount,
          reference: reference,
          onSuccess: async (ref: string) => {
            toast.success("Payment successful! Verifying...", {
              description: `Reference: ${ref}. Credits will be added shortly.`
            });
            await supabase.functions.invoke('verify-paystack-transaction', {
              body: { reference: ref, type: 'credits', credits: selectedPackage.credits }
            });
          },
          onCancel: () => {
            toast.info("Payment canceled.");
          },
        });
        setPaymentDialogOpen(false);

      } else if (paymentSettings?.enabled && paymentSettings?.activeGateway === 'stripe') {
        // Stripe logic remains unchanged
        const { data, error } = await supabase.functions.invoke('create-payment', {
          body: { /* ... */ }
        });
        if (error) throw new Error(error.message);
        if (data?.url) window.location.href = data.url;
        setPaymentDialogOpen(false);
      } else {
        toast.error("Payment processing is currently disabled or no gateway is configured.");
      }
    } catch (error: any) {
      toast.error("Purchase failed", { description: error.message });
    } finally {
      setProcessing(false);
    }
  };

  const confirmUpgradeOrSub = async () => {
    if (!selectedPlanId) return;
    const plan = plans.find(p => p.id === selectedPlanId);
    if (!plan || !user || !user.email) return;

    setPaymentProcessing(true);
    try {
      if (paymentSettings?.enabled && paymentSettings?.activeGateway === 'paystack') {
        const paystackPublicKey = paymentSettings.mode === 'live'
          ? paymentSettings.paystack?.live?.publicKey
          : paymentSettings.paystack?.test?.publicKey;

        if (!paystackPublicKey) {
          toast.error("Paystack public key is not configured for the current mode.");
          return;
        }

        const reference = `txn_sub_${user.id}_${Date.now()}`;
        startPaystackPayment({
          publicKey: paystackPublicKey,
          email: user.email,
          amount: plan.price,
          reference: reference,
          onSuccess: async (ref: string) => {
            toast.success("Payment successful! Verifying subscription...");
            await supabase.functions.invoke('verify-paystack-transaction', {
              body: { reference: ref, type: 'subscription', planId: plan.id }
            });
          },
          onCancel: () => {
            toast.info("Payment canceled.");
          },
        });
      } else if (paymentSettings?.enabled && paymentSettings?.activeGateway === 'stripe') {
        // Stripe logic remains unchanged
        const { data, error } = await supabase.functions.invoke('create-subscription', {
          body: { /* ... */ }
        });
        if (error) throw new Error(error.message);
        if (data?.url) window.location.href = data.url;
      } else {
        toast.error("Payment processing is currently disabled or no gateway is configured.");
      }
    } catch (error: any) {
      toast.error("Subscription failed", { description: error.message });
    } finally {
      setPaymentProcessing(false);
      setDialogOpen(false);
    }
  };

  // ... (rest of the component, including handleSubscriptionChange, confirmDowngrade)

  const selectedPlanDetails = plans.find(p => p.id === selectedPlanId);
  const currentUserPlan = user?.subscription?.planId ? plans.find(p => p.id === user.subscription.planId) : null;

  const getButtonText = (plan: Plan) => {
    if (!currentUserPlan) return 'Subscribe Now';
    if (plan.id === currentUserPlan.id) return 'Current Plan';
    if (plan.rank > currentUserPlan.rank) return `Upgrade`;
    return 'Downgrade';
  };

  const paystackPublicKey = paymentSettings?.mode === 'live'
    ? paymentSettings?.paystack?.live?.publicKey
    : paymentSettings?.paystack?.test?.publicKey;

  // A simple check for stripe public key for consistency, assuming it would be structured similarly
  const stripePublicKey = paymentSettings?.mode === 'live'
    ? paymentSettings?.stripe?.live?.publicKey
    : paymentSettings?.stripe?.test?.publicKey;

  const paymentReady = !isLoadingPaymentSettings && paymentSettings?.enabled &&
    ((paymentSettings.activeGateway === 'paystack' && paystackPublicKey) ||
     (paymentSettings.activeGateway === 'stripe' && stripePublicKey));

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 text-white">
      {/* ... Tabs and other UI ... */}
      <TabsContent value="credits" className="mt-6">
        {/* ... other credit UI ... */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {creditPackages.map((pkg, index) => (
              <Card key={index} className={`relative bg-black/20 border-white/10 ${pkg.popular ? 'border-dark-purple shadow-lg' : ''}`}>
                {/* ... Card content ... */}
                <CardContent className="text-center">
                  <div className="text-sm text-gray-400 mb-4">${(pkg.amount / pkg.credits).toFixed(2)} per credit</div>
                  <Button
                    onClick={() => { setSelectedPackage(pkg); setPaymentDialogOpen(true); }}
                    className="w-full"
                    variant={pkg.popular ? "default" : "outline"}
                    disabled={isLoadingPaymentSettings || !paymentReady}
                  >
                    {isLoadingPaymentSettings ? 'Loading...' : paymentReady ? 'Purchase Now' : 'Payments Disabled'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            {/* ... Custom amount card ... */}
            <CardContent>
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <Label htmlFor="custom-amount" className="text-gray-300">Amount (USD)</Label>
                  <Input id="custom-amount" type="number" placeholder="Enter amount" value={customAmount} onChange={(e) => setCustomAmount(e.target.value)} min="1" step="1" className="bg-black/20 border-white/20 text-white placeholder-gray-500"/>
                </div>
                <Button
                  onClick={() => { const amount = parseFloat(customAmount); if (!isNaN(amount) && amount >= 1) { setSelectedPackage({ credits: Math.floor(amount), amount: amount }); setPaymentDialogOpen(true); } else { toast.error('Please enter a valid amount'); } }}
                  disabled={!customAmount || isLoadingPaymentSettings || !paymentReady}
                  className="bg-dark-purple hover:bg-opacity-90 font-bold"
                >
                  {isLoadingPaymentSettings ? 'Loading...' : paymentReady ? 'Purchase' : 'Payments Disabled'}
                </Button>
              </div>
            </CardContent>
          </Card>
      </TabsContent>
      {/* ... Dialogs and other UI ... */}
    </div>
  );
};

export default Billing;
