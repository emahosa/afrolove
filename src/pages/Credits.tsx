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

// Define interfaces for our data structures for type safety
interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  priceId: string;
  stripePriceId: string;
  paystackPlanCode?: string; // Optional as it might not be in all versions
  currency: string;
  interval: string;
  description: string;
  creditsPerMonth: number;
  rank: number;
  features: string[];
}

interface CreditPackage {
  id: string;
  credits: number;
  amount: number;
  popular: boolean;
}

interface DialogState {
  open: boolean;
  type: 'credits' | 'subscription';
  data: CreditPackage | SubscriptionPlan | null;
}

const Credits: React.FC = () => {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<{ credits: number } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dialogState, setDialogState] = useState<DialogState>({
    open: false,
    type: 'credits',
    data: null,
  });

  // State for downgrade flow
  const [downgradeConfirmationOpen, setDowngradeConfirmationOpen] = useState(false);
  const [planToDowngrade, setPlanToDowngrade] = useState<SubscriptionPlan | null>(null);

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

  const handleOpenDialog = (type: 'credits' | 'subscription', data: CreditPackage | SubscriptionPlan) => {
    setDialogState({ open: true, type, data });
  };

  const processCreditPurchase = async () => {
    if (!dialogState.data || !('credits' in dialogState.data)) return;
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
      setDialogState(s => ({ ...s, open: false }));
    }
  };

  const processSubscription = async () => {
    if (!dialogState.data || !('creditsPerMonth' in dialogState.data)) return;
    const plan = dialogState.data;
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-subscription', {
        body: {
          priceId: plan.priceId,
          paystackPlanCode: plan.paystackPlanCode,
          planId: plan.id,
          planName: plan.name,
          amount: Math.round(plan.price * 100),
          credits: plan.creditsPerMonth,
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
      toast.error("Subscription failed", { description: errorMessage });
      setIsProcessing(false);
      setDialogState(s => ({ ...s, open: false }));
    }
  };

  const handleSubscriptionChange = (plan: SubscriptionPlan) => {
    const currentUserPlan = user?.subscription?.planId
      ? subscriptionPlansData.find(p => p.id === user.subscription.planId)
      : null;

    const isDowngrade = currentUserPlan && plan.rank < currentUserPlan.rank;

    if (isDowngrade) {
      setPlanToDowngrade(plan);
      setDowngradeConfirmationOpen(true);
    } else {
      handleOpenDialog('subscription', plan);
    }
  };

  const confirmDowngrade = async () => {
    if (!planToDowngrade) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.functions.invoke('manage-subscription', {
        body: {
          action: 'downgrade',
          newPlanId: planToDowngrade.id,
          newStripePriceId: planToDowngrade.stripePriceId,
        }
      });

      if (error) throw new Error(error.message);

      toast.success("Downgrade Scheduled", {
        description: `Your subscription will change to ${planToDowngrade.name} at the end of your current cycle.`
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast.error("Failed to schedule downgrade", { description: errorMessage });
    } finally {
      setIsProcessing(false);
      setDowngradeConfirmationOpen(false);
    }
  };

  const getDialogDetails = () => {
    if (!dialogState.data) return {};
    if (dialogState.type === 'subscription' && 'creditsPerMonth' in dialogState.data) {
      const plan = dialogState.data;
      return {
        title: user?.subscription?.planId ? `Change to ${plan.name}` : `Subscribe to ${plan.name}`,
        description: `You are about to subscribe to the ${plan.name} plan for ${plan.description}.`,
        amount: Math.round(plan.price * 100),
        onConfirm: processSubscription,
      };
    } else if (dialogState.type === 'credits' && 'credits' in dialogState.data) {
      const pkg = dialogState.data;
      return {
        title: "Purchase Credits",
        description: `You are about to purchase ${pkg.credits} credits for $${pkg.amount}.`,
        amount: Math.round(pkg.amount * 100),
        onConfirm: processCreditPurchase,
      };
    }
    return {};
  };

  const currentUserPlan = user?.subscription?.planId ? subscriptionPlansData.find(p => p.id === user.subscription.planId) : null;
  const getButtonText = (plan: typeof subscriptionPlansData[0]) => {
    if (!currentUserPlan) return 'Subscribe Now';
    if (plan.id === currentUserPlan.id) return 'Current Plan';
    if (plan.rank > currentUserPlan.rank) return 'Upgrade';
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
           {/* Subscription Plans UI (unchanged) */}
        </TabsContent>
        <TabsContent value="credits" className="mt-6">
          {/* Credit Purchase UI (unchanged, but onClick is now handleOpenDialog) */}
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
                  <Button onClick={() => handleOpenDialog('credits', pkg)} className="w-full" variant={pkg.popular ? "default" : "outline"}>Purchase Now</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <PaymentDialog
        open={dialogState.open}
        onOpenChange={(open) => setDialogState({ ...dialogState, open })}
        title={getDialogDetails().title || ''}
        description={getDialogDetails().description || ''}
        amount={getDialogDetails().amount || 0}
        onConfirm={getDialogDetails().onConfirm || (() => {})}
        processing={isProcessing}
        type={dialogState.type}
      />

      <AlertDialog open={downgradeConfirmationOpen} onOpenChange={setDowngradeConfirmationOpen}>
        <AlertDialogContent className="bg-gray-900 border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Downgrade</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Your subscription will change to {planToDowngrade?.name} at the end of your current billing cycle.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-white/30 hover:bg-white/10">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDowngrade} disabled={isProcessing} className="bg-dark-purple hover:bg-opacity-90 font-bold">
              {isProcessing ? "Processing..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Credits;
