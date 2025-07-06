
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Star, Music, Check, Info, CreditCard, Lock } from "lucide-react";
import { toast } from "sonner";
import { debugCreditsSystem } from "@/utils/supabaseDebug";
import { updateUserCredits } from "@/utils/credits";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { verifyPaymentSuccess, refreshUserData } from "@/utils/paymentVerification";

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
    priceId: "price_basic_monthly", // These would be your actual Stripe price IDs
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
  const { user, updateUserCredits: authUpdateUserCredits, isVoter, isSubscriber, isAdmin, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const userIsOnlyVoter = isVoter() && !isSubscriber() && !isAdmin() && !isSuperAdmin();
  const [activeTab, setActiveTab] = useState(userIsOnlyVoter ? "membership" : "credits");
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<string | undefined>(user?.subscription);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [creditBalance, setCreditBalance] = useState(user?.credits || 0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (user) {
      setCreditBalance(user.credits || 0);
      console.log("Credits component: User credits updated from user object:", user.credits);
      
      if (user.id) {
        debugCreditsSystem(user.id);
      }
    }
  }, [user]);

  // Handle payment success verification
  useEffect(() => {
    const handlePaymentSuccess = async () => {
      const paymentStatus = searchParams.get('payment');
      const subscriptionStatus = searchParams.get('subscription');
      const sessionId = searchParams.get('session_id');

      if (paymentStatus === 'success' || subscriptionStatus === 'success') {
        setIsVerifying(true);
        console.log("Payment success detected, verifying...");

        try {
          // Wait longer for webhook to process
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Retry verification up to 3 times
          let attempts = 0;
          let result;
          
          while (attempts < 3) {
            result = await verifyPaymentSuccess(sessionId || undefined);
            
            if (result.success) {
              break;
            }
            
            attempts++;
            if (attempts < 3) {
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
          
          if (result && result.success) {
            toast.success("Payment Successful!", {
              description: result.message
            });
            
            // Refresh user data to get updated credits/subscription
            await refreshUserData();
            
            // Clear URL parameters
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);
            
            // Redirect to dashboard after successful payment
            setTimeout(() => {
              navigate('/dashboard');
            }, 2000);
          } else {
            toast.warning("Payment Processing", {
              description: "Your payment is being processed. Please refresh in a moment."
            });
          }
        } catch (error) {
          console.error("Error verifying payment:", error);
          toast.error("Verification Error", {
            description: "Unable to verify payment. Please contact support if the issue persists."
          });
        } finally {
          setIsVerifying(false);
        }
      }
    };

    handlePaymentSuccess();
  }, [searchParams, navigate]);

  // Show verification screen while processing payment
  if (isVerifying) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-melody-secondary"></div>
        <h2 className="text-xl font-semibold">Verifying Payment...</h2>
        <p className="text-muted-foreground">Please wait while we confirm your payment.</p>
      </div>
    );
  }

  const handleBuyCredits = async (packId: string) => {
    if (userIsOnlyVoter) {
      toast.error("Subscription Required", { description: "Please subscribe to a plan to purchase credits." });
      setActiveTab("membership");
      return;
    }

    setPaymentProcessing(true);
    setErrorMessage(null);
    
    try {
      const pack = creditPacks.find(p => p.id === packId);
      
      if (!pack) {
        throw new Error("Selected credit pack not found");
      }
      
      if (!user || !user.id) {
        throw new Error("You must be logged in to purchase credits");
      }
      
      console.log("Creating Stripe session for credits:", pack.credits, "for user:", user.id);
      
      // Create Stripe checkout session for one-time payment
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          type: 'credits',
          packId: pack.id,
          amount: Math.round(pack.price * 100), // Convert to cents
          credits: pack.credits,
          description: `${pack.name} - ${pack.credits} credits`
        }
      });

      if (error) {
        console.error('Error creating checkout session:', error);
        throw new Error(error.message || 'Failed to create checkout session');
      }

      if (data?.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
      
      setDialogOpen(false);
    } catch (error: any) {
      console.error("Error purchasing credits:", error);
      
      setErrorMessage(error.message || "There was an error processing your purchase");
      
      toast.error("Purchase failed", {
        description: error.message || "There was an error processing your purchase. Please try again.",
      });
    } finally {
      setPaymentProcessing(false);
      setSelectedPackId(null);
    }
  };

  const handleSubscribe = async (planId: string) => {
    setPaymentProcessing(true);
    
    try {
      const plan = subscriptionPlans.find(p => p.id === planId);
      
      if (!plan) {
        throw new Error("Selected plan not found");
      }
      
      if (!user || !user.id) {
        throw new Error("You must be logged in to subscribe");
      }
      
      console.log("Creating Stripe subscription session for plan:", plan.name);
      
      // Create Stripe checkout session for subscription
      const { data, error } = await supabase.functions.invoke('create-subscription', {
        body: {
          priceId: plan.priceId,
          planId: plan.id,
          planName: plan.name,
          amount: Math.round(plan.price * 100) // Convert to cents
        }
      });

      if (error) {
        console.error('Error creating subscription session:', error);
        throw new Error(error.message || 'Failed to create subscription session');
      }

      if (data?.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
      
      setDialogOpen(false);
    } catch (error: any) {
      console.error("Error subscribing:", error);
      toast.error("Subscription failed", {
        description: error.message || "There was an error processing your subscription. Please try again.",
      });
    } finally {
      setPaymentProcessing(false);
      setSelectedPlanId(null);
    }
  };

  const openPurchaseDialog = (packId: string) => {
    setSelectedPackId(packId);
    setDialogOpen(true);
  };

  const openSubscribeDialog = (planId: string) => {
    setSelectedPlanId(planId);
    setDialogOpen(true);
  };

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
      
      {errorMessage && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200">
          <p className="font-medium">Error: {errorMessage}</p>
          <p className="text-sm">Please try again or contact support if the issue persists.</p>
        </div>
      )}
      
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
                      <CardTitle className="flex justify-between items-center">
                        {pack.name}
                      </CardTitle>
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
                        onClick={() => openPurchaseDialog(pack.id)}
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
                    onClick={() => openSubscribeDialog(plan.id)}
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

      {/* Purchase Dialog */}
      <Dialog open={dialogOpen && selectedPackId !== null} onOpenChange={(open) => !open && setSelectedPackId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Purchase {creditPacks.find(p => p.id === selectedPackId)?.name}</DialogTitle>
            <DialogDescription>
              You are about to purchase {creditPacks.find(p => p.id === selectedPackId)?.credits} credits for ${creditPacks.find(p => p.id === selectedPackId)?.price}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedPackId && (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span>{creditPacks.find(p => p.id === selectedPackId)?.credits} Credits</span>
                  <span>${creditPacks.find(p => p.id === selectedPackId)?.price}</span>
                </div>
                <div className="border-t pt-2 flex items-center justify-between font-bold">
                  <span>Total</span>
                  <span>${creditPacks.find(p => p.id === selectedPackId)?.price}</span>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button 
              onClick={() => selectedPackId && handleBuyCredits(selectedPackId)} 
              disabled={paymentProcessing}
              className="w-full bg-melody-secondary hover:bg-melody-secondary/90"
            >
              {paymentProcessing ? "Processing..." : "Confirm Purchase"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subscribe Dialog */}
      <Dialog open={dialogOpen && selectedPlanId !== null} onOpenChange={(open) => !open && setSelectedPlanId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Subscribe to {subscriptionPlans.find(p => p.id === selectedPlanId)?.name} Plan</DialogTitle>
            <DialogDescription>
              You are about to subscribe to the {subscriptionPlans.find(p => p.id === selectedPlanId)?.name} plan for ${subscriptionPlans.find(p => p.id === selectedPlanId)?.price}/month.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedPlanId && (
              <>
                <div className="flex items-center justify-between">
                  <span>Monthly subscription</span>
                  <span>${subscriptionPlans.find(p => p.id === selectedPlanId)?.price}/month</span>
                </div>
                <div className="flex items-center justify-between font-medium">
                  <span>{subscriptionPlans.find(p => p.id === selectedPlanId)?.creditsPerMonth} credits monthly</span>
                </div>
                <div className="border-t pt-2 flex items-center justify-between font-bold">
                  <span>Total today</span>
                  <span>${subscriptionPlans.find(p => p.id === selectedPlanId)?.price}</span>
                </div>
              </>
            )}
          </div>
          <DialogFooter className="flex-col">
            <div className="flex items-center justify-center w-full mb-4">
              <CreditCard className="mr-2 h-4 w-4" />
              <span className="text-sm text-muted-foreground">Secure payment processing</span>
            </div>
            <Button 
              onClick={() => selectedPlanId && handleSubscribe(selectedPlanId)} 
              disabled={paymentProcessing}
              className="w-full bg-melody-secondary hover:bg-melody-secondary/90"
            >
              {paymentProcessing ? "Processing..." : "Confirm Subscription"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Credits;
