
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Star, Music, Check, Info, CreditCard } from "lucide-react";
import { toast } from "sonner";

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
  const { user, updateUserCredits } = useAuth();
  const [activeTab, setActiveTab] = useState("credits");
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<string | undefined>(user?.subscription);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const handleBuyCredits = async (packId: string) => {
    setPaymentProcessing(true);
    
    try {
      const pack = creditPacks.find(p => p.id === packId);
      
      if (pack && user) {
        // Directly call updateUserCredits with the correct parameters
        await updateUserCredits(pack.credits);
        
        toast.success("Credits Purchased!", {
          description: `${pack.credits} credits have been added to your account.`,
        });
        
        setDialogOpen(false);
      } else {
        throw new Error("Pack not found or user not logged in");
      }
    } catch (error) {
      console.error("Error purchasing credits:", error);
      toast.error("Purchase failed", {
        description: "There was an error processing your purchase. Please try again.",
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
      
      if (plan && user) {
        setCurrentPlan(planId);
        // Directly call updateUserCredits with the correct parameters
        await updateUserCredits(plan.creditsPerMonth);
        
        toast.success("Subscription Activated!", {
          description: `You've subscribed to the ${plan.name} plan. ${plan.creditsPerMonth} credits have been added to your account.`,
        });
        
        setDialogOpen(false);
      } else {
        throw new Error("Plan not found or user not logged in");
      }
    } catch (error) {
      console.error("Error subscribing:", error);
      toast.error("Subscription failed", {
        description: "There was an error processing your subscription. Please try again.",
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
          <span className="font-bold">{user?.credits || 0}</span>
        </div>
        <div className="text-sm text-muted-foreground">Current credit balance</div>
      </div>
      
      <Tabs defaultValue="credits" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="credits">Buy Credits</TabsTrigger>
          <TabsTrigger value="membership">Membership Plans</TabsTrigger>
        </TabsList>
        
        <TabsContent value="credits" className="space-y-4">
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
                  <Dialog open={dialogOpen && selectedPackId === pack.id} onOpenChange={(open) => !open && setSelectedPackId(null)}>
                    <DialogTrigger asChild>
                      <Button 
                        className="w-full bg-melody-secondary hover:bg-melody-secondary/90"
                        onClick={() => openPurchaseDialog(pack.id)}
                      >
                        Purchase
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Purchase {pack.name}</DialogTitle>
                        <DialogDescription>
                          You are about to purchase {pack.credits} credits for ${pack.price}.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                        <div className="flex items-center justify-between mb-2">
                          <span>{pack.credits} Credits</span>
                          <span>${pack.price}</span>
                        </div>
                        <div className="border-t pt-2 flex items-center justify-between font-bold">
                          <span>Total</span>
                          <span>${pack.price}</span>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button 
                          onClick={() => handleBuyCredits(pack.id)} 
                          disabled={paymentProcessing}
                          className="w-full bg-melody-secondary hover:bg-melody-secondary/90"
                        >
                          {paymentProcessing ? "Processing..." : "Confirm Purchase"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
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
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        className={`w-full ${currentPlan === plan.id ? "bg-muted hover:bg-muted" : "bg-melody-secondary hover:bg-melody-secondary/90"}`}
                        disabled={currentPlan === plan.id}
                      >
                        {currentPlan === plan.id ? "Current Plan" : "Subscribe"}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Subscribe to {plan.name} Plan</DialogTitle>
                        <DialogDescription>
                          You are about to subscribe to the {plan.name} plan for ${plan.price}/month.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="flex items-center justify-between">
                          <span>Monthly subscription</span>
                          <span>${plan.price}/month</span>
                        </div>
                        <div className="flex items-center justify-between font-medium">
                          <span>{plan.creditsPerMonth} credits monthly</span>
                        </div>
                        <div className="border-t pt-2 flex items-center justify-between font-bold">
                          <span>Total today</span>
                          <span>${plan.price}</span>
                        </div>
                      </div>
                      <DialogFooter className="flex-col">
                        <div className="flex items-center justify-center w-full mb-4">
                          <CreditCard className="mr-2 h-4 w-4" />
                          <span className="text-sm text-muted-foreground">Secure payment processing</span>
                        </div>
                        <Button 
                          onClick={() => handleSubscribe(plan.id)} 
                          disabled={paymentProcessing}
                          className="w-full bg-melody-secondary hover:bg-melody-secondary/90"
                        >
                          {paymentProcessing ? "Processing..." : "Confirm Subscription"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
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
    </div>
  );
};

export default Credits;
