
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Star, Info, Lock, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePaymentVerification } from "@/components/payment/PaymentVerificationProvider";
import PaymentLoadingScreen from "@/components/payment/PaymentLoadingScreen";
import PaymentDialog from "@/components/payment/PaymentDialog";

const creditPacks = [
  { id: "pack1", name: "Starter Pack", credits: 10, price: 4.99, popular: false },
  { id: "pack2", name: "Creator Pack", credits: 30, price: 9.99, popular: true },
  { id: "pack3", name: "Pro Pack", credits: 75, price: 19.99, popular: false },
  { id: "pack4", name: "Studio Pack", credits: 200, price: 49.99, popular: false },
];

const subscriptionPlans = [
  { 
    id: "basic",
    name: "Basic", 
    price: 9.99, 
    popular: false,
    creditsPerMonth: 20,
    priceId: "price_basic_monthly",
    features: [
      "20 credits monthly",
      "Access to all basic AI models",
      "Standard quality exports",
      "Email support"
    ] 
  },
  { 
    id: "premium",
    name: "Premium", 
    price: 19.99, 
    popular: true,
    creditsPerMonth: 75,
    priceId: "price_premium_monthly",
    features: [
      "75 credits monthly",
      "Access to all premium AI models",
      "High quality exports",
      "Priority email support",
      "Unlimited song storage"
    ] 
  },
  { 
    id: "unlimited",
    name: "Professional", 
    price: 39.99, 
    popular: false,
    creditsPerMonth: 200,
    priceId: "price_professional_monthly",
    features: [
      "200 credits monthly",
      "Access to all AI models including beta",
      "Maximum quality exports",
      "Priority support with 24hr response",
      "Unlimited song storage",
      "Commercial usage rights",
      "Advanced editing tools"
    ] 
  }
];

const Credits = () => {
  const { user, isVoter, isSubscriber, isAdmin, isSuperAdmin } = useAuth();
  const { isVerifying } = usePaymentVerification();
  
  const userIsOnlyVoter = isVoter() && !isSubscriber() && !isAdmin() && !isSuperAdmin();
  const [activeTab, setActiveTab] = useState(userIsOnlyVoter ? "membership" : "credits");
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [creditBalance, setCreditBalance] = useState(user?.credits || 0);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setCreditBalance(user.credits || 0);
      // Get current plan from user subscription or role
      if (isSubscriber()) {
        // You can determine the current plan based on user subscription data
        // For now, setting a default - this should be based on actual subscription data
        setCurrentPlan("premium");
      } else {
        setCurrentPlan(null);
      }
    }
  }, [user, isSubscriber]);

  if (isVerifying) {
    return <PaymentLoadingScreen title="Verifying Payment..." />;
  }

  const handleBuyCredits = async (packId: string) => {
    if (userIsOnlyVoter) {
      toast.error("Subscription Required", { description: "Please subscribe to a plan to purchase credits." });
      setActiveTab("membership");
      return;
    }

    setPaymentProcessing(true);
    
    try {
      const pack = creditPacks.find(p => p.id === packId);
      if (!pack || !user?.id) {
        throw new Error("Invalid pack or user not found");
      }
      
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          type: 'credits',
          packId: pack.id,
          amount: Math.round(pack.price * 100),
          credits: pack.credits,
          description: `${pack.name} - ${pack.credits} credits`
        }
      });

      if (error) throw new Error(error.message || 'Failed to create checkout session');
      if (data?.url) window.location.href = data.url;
      else throw new Error('No checkout URL received');
      
      setDialogOpen(false);
    } catch (error: any) {
      console.error("Error purchasing credits:", error);
      toast.error("Purchase failed", { description: error.message });
    } finally {
      setPaymentProcessing(false);
      setSelectedPackId(null);
    }
  };

  const handleSubscribe = async (planId: string) => {
    setPaymentProcessing(true);
    
    try {
      const plan = subscriptionPlans.find(p => p.id === planId);
      if (!plan || !user?.id) {
        throw new Error("Invalid plan or user not found");
      }
      
      const { data, error } = await supabase.functions.invoke('create-subscription', {
        body: {
          priceId: plan.priceId,
          planId: plan.id,
          planName: plan.name,
          amount: Math.round(plan.price * 100)
        }
      });

      if (error) throw new Error(error.message || 'Failed to create subscription session');
      if (data?.url) window.location.href = data.url;
      else throw new Error('No checkout URL received');
      
      setDialogOpen(false);
    } catch (error: any) {
      console.error("Error subscribing:", error);
      toast.error("Subscription failed", { description: error.message });
    } finally {
      setPaymentProcessing(false);
      setSelectedPlanId(null);
    }
  };

  const selectedPack = creditPacks.find(p => p.id === selectedPackId);
  const selectedPlan = subscriptionPlans.find(p => p.id === selectedPlanId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Credits & Membership</h1>
        <p className="text-muted-foreground">Purchase credits or subscribe to a membership plan</p>
      </div>
      
      <div className="flex items-center gap-3 p-4 bg-card rounded-lg border">
        <div className="flex items-center gap-1 text-lg">
          <Star className="h-6 w-6 fill-melody-secondary text-melody-secondary" />
          <span className="font-bold">{creditBalance}</span>
        </div>
        <div className="text-sm text-muted-foreground">Current credit balance</div>
      </div>
      
      <Tabs defaultValue="credits" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="credits">Buy Credits</TabsTrigger>
          <TabsTrigger value="membership">Membership Plans</TabsTrigger>
        </TabsList>
        
        <TabsContent value="credits" className="space-y-4">
          {userIsOnlyVoter ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-yellow-500" />
                  Unlock Credit Purchases
                </CardTitle>
                <CardDescription>
                  Purchasing additional credits is a feature for subscribers.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p>
                  To buy credit packs, please subscribe to one of our membership plans. Subscribers get monthly credits and the ability to top-up anytime.
                </p>
              </CardContent>
              <CardFooter>
                <Button onClick={() => setActiveTab("membership")} className="w-full sm:w-auto">
                  View Membership Plans
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {creditPacks.map((pack) => (
                  <Card key={pack.id} className={pack.popular ? "border-melody-secondary" : ""}>
                    {pack.popular && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <Badge className="bg-melody-secondary">Most Popular</Badge>
                      </div>
                    )}
                    <CardHeader>
                      <CardTitle>{pack.name}</CardTitle>
                      <CardDescription>One-time purchase</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold mb-4">${pack.price}</div>
                      <div className="flex items-center gap-2 mb-4">
                        <Star className="h-5 w-5 fill-melody-secondary text-melody-secondary" />
                        <span className="font-medium">{pack.credits} credits</span>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button
                        className="w-full bg-melody-secondary hover:bg-melody-secondary/90"
                        onClick={() => {
                          setSelectedPackId(pack.id);
                          setDialogOpen(true);
                        }}
                      >
                        Purchase
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>

              <div className="bg-muted p-4 rounded flex items-center gap-3 text-sm">
                <Info className="h-5 w-5 text-melody-secondary flex-shrink-0" />
                <div>
                  Credits never expire and can be used for song generation, competition entries, and other premium features.
                </div>
              </div>
            </>
          )}
        </TabsContent>
        
        <TabsContent value="membership" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {subscriptionPlans.map((plan) => (
              <Card key={plan.id} className={`flex flex-col ${plan.popular ? "border-melody-secondary" : ""}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-melody-secondary">Most Popular</Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>Monthly subscription</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="text-3xl font-bold mb-4">${plan.price}<span className="text-sm text-muted-foreground font-normal">/month</span></div>
                  <div className="flex items-center gap-2 mb-6">
                    <Star className="h-5 w-5 fill-melody-secondary text-melody-secondary" />
                    <span className="font-medium">{plan.creditsPerMonth} credits monthly</span>
                  </div>
                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-melody-secondary flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button 
                    className={`w-full ${currentPlan === plan.id ? "bg-muted hover:bg-muted" : "bg-melody-secondary hover:bg-melody-secondary/90"}`}
                    disabled={currentPlan === plan.id}
                    onClick={() => {
                      setSelectedPlanId(plan.id);
                      setDialogOpen(true);
                    }}
                  >
                    {currentPlan === plan.id ? "Current Plan" : "Subscribe"}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
          
          <div className="bg-muted p-4 rounded flex items-center gap-3 text-sm">
            <Info className="h-5 w-5 text-melody-secondary flex-shrink-0" />
            <div>
              Membership benefits include monthly credits and exclusive features. You can cancel your subscription anytime.
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Payment Dialogs */}
      {selectedPack && (
        <PaymentDialog
          open={dialogOpen && selectedPackId !== null}
          onOpenChange={(open) => {
            if (!open) setSelectedPackId(null);
            setDialogOpen(open);
          }}
          title={`Purchase ${selectedPack.name}`}
          description={`You are about to purchase ${selectedPack.credits} credits for $${selectedPack.price}.`}
          amount={selectedPack.price}
          credits={selectedPack.credits}
          onConfirm={() => handleBuyCredits(selectedPackId!)}
          processing={paymentProcessing}
          type="credits"
        />
      )}

      {selectedPlan && (
        <PaymentDialog
          open={dialogOpen && selectedPlanId !== null}
          onOpenChange={(open) => {
            if (!open) setSelectedPlanId(null);
            setDialogOpen(open);
          }}
          title={`Subscribe to ${selectedPlan.name} Plan`}
          description={`You are about to subscribe to the ${selectedPlan.name} plan for $${selectedPlan.price}/month.`}
          amount={selectedPlan.price}
          onConfirm={() => handleSubscribe(selectedPlanId!)}
          processing={paymentProcessing}
          type="subscription"
        />
      )}
    </div>
  );
};

export default Credits;
