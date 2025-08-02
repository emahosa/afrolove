import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, CreditCard } from "lucide-react";
import PaymentDialog from "@/components/payment/PaymentDialog";
import { toast } from "sonner";
import { useAffiliateTracking } from "@/hooks/useAffiliateTracking";

const Credits: React.FC = () => {
  const { user, refreshUserData, isSubscriber } = useAuth();
  const { trackActivity } = useAffiliateTracking();
  const [userCredits, setUserCredits] = useState<number>(0);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Track subscription page visit
  useEffect(() => {
    trackActivity('subscription_page_visit');
  }, [trackActivity]);

  const fetchUserCredits = async () => {
    if (user?.id) {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("credits")
          .eq("id", user.id)
          .single();

        if (error) {
          console.error("Error fetching credits:", error);
          return;
        }

        setUserCredits(data?.credits || 0);
      } catch (err) {
        console.error("Error fetching user credits:", err);
      }
    }
  };

  useEffect(() => {
    fetchUserCredits();
  }, [user?.id]);

  const creditPackages = [
    {
      id: "starter",
      name: "Starter Pack",
      credits: 50,
      price: 9.99,
      popular: false,
    },
    {
      id: "pro",
      name: "Pro Pack",
      credits: 120,
      price: 19.99,
      popular: true,
      bonus: 20,
    },
    {
      id: "ultimate",
      name: "Ultimate Pack",
      credits: 250,
      price: 39.99,
      popular: false,
      bonus: 50,
    },
  ];

  const subscriptionPlans = [
    {
      id: "basic",
      name: "Basic Plan",
      price: 14.99,
      credits: 100,
      features: [
        "100 monthly credits",
        "Standard music generation",
        "Basic voice cloning",
        "Email support"
      ],
      popular: false,
    },
    {
      id: "premium",
      name: "Premium Plan",
      price: 29.99,
      credits: 250,
      features: [
        "250 monthly credits",
        "Advanced music generation",
        "Unlimited voice cloning",
        "Priority support",
        "Custom song requests"
      ],
      popular: true,
    },
    {
      id: "enterprise",
      name: "Enterprise Plan",
      price: 59.99,
      credits: 500,
      features: [
        "500 monthly credits",
        "Premium music generation",
        "Unlimited everything",
        "24/7 dedicated support",
        "Custom integrations"
      ],
      popular: false,
    },
  ];

  const handlePurchase = (packageData: any, type: 'credits' | 'subscription') => {
    setSelectedPackage({ ...packageData, type });
    setIsPaymentDialogOpen(true);
  };

  const handlePaymentConfirm = async () => {
    if (!selectedPackage || !user) return;

    setProcessing(true);
    try {
      if (selectedPackage.type === 'subscription') {
        const { data, error } = await supabase.functions.invoke('create-subscription', {
          body: {
            plan_id: selectedPackage.id,
            user_id: user.id
          }
        });

        if (error) throw error;

        if (data?.checkout_url) {
          window.location.href = data.checkout_url;
        } else {
          // Track subscription completion for affiliate system
          await trackActivity('subscription_completed', {
            subscription_amount: selectedPackage.price,
            plan_id: selectedPackage.id
          });
          
          toast.success("Subscription activated successfully!");
          await refreshUserData();
          fetchUserCredits();
          setIsPaymentDialogOpen(false);
        }
      } else {
        const { data, error } = await supabase.functions.invoke('purchase-credits', {
          body: {
            package_id: selectedPackage.id,
            credits: selectedPackage.credits + (selectedPackage.bonus || 0),
            amount: selectedPackage.price
          }
        });

        if (error) throw error;

        if (data?.checkout_url) {
          window.location.href = data.checkout_url;
        } else {
          toast.success("Credits purchased successfully!");
          fetchUserCredits();
          setIsPaymentDialogOpen(false);
        }
      }
    } catch (error: any) {
      console.error("Payment error:", error);
      toast.error(error.message || "Payment failed. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const isUserSubscribed = isSubscriber();

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Current Credits Display */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="mr-2 h-6 w-6" />
            Your Credits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-primary">{userCredits} Credits</div>
          <p className="text-muted-foreground mt-2">
            Use credits to generate music, create custom songs, and more!
          </p>
        </CardContent>
      </Card>

      {/* Subscription Plans Section */}
      {!isUserSubscribed && (
        <div className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold tracking-tight mb-4">Choose Your Plan</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Get unlimited access to all features with monthly credits included
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {subscriptionPlans.map((plan) => (
              <Card key={plan.id} className={`relative ${plan.popular ? 'border-primary shadow-lg scale-105' : ''}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                  </div>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">${plan.price}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{plan.credits} credits included</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={plan.popular ? "default" : "outline"}
                    onClick={() => handlePurchase(plan, 'subscription')}
                  >
                    Subscribe Now
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Credit Packages Section */}
      <div className="mb-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold tracking-tight mb-4">
            {isUserSubscribed ? "Additional Credits" : "Credit Packages"}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {isUserSubscribed 
              ? "Need more credits? Purchase additional credit packages" 
              : "One-time credit purchases for flexible usage"
            }
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {creditPackages.map((pkg) => (
            <Card key={pkg.id} className={`relative ${pkg.popular ? 'border-primary shadow-md' : ''}`}>
              {pkg.popular && (
                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                  <Badge variant="secondary">Best Value</Badge>
                </div>
              )}
              <CardHeader className="text-center">
                <CardTitle>{pkg.name}</CardTitle>
                <div className="mt-4">
                  <span className="text-3xl font-bold">${pkg.price}</span>
                </div>
                <div className="mt-2">
                  <span className="text-lg font-semibold">{pkg.credits} Credits</span>
                  {pkg.bonus && (
                    <span className="text-sm text-green-600 block">+ {pkg.bonus} Bonus Credits!</span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  variant={pkg.popular ? "default" : "outline"}
                  onClick={() => handlePurchase(pkg, 'credits')}
                >
                  Purchase Credits
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Payment Dialog */}
      <PaymentDialog
        open={isPaymentDialogOpen}
        onOpenChange={setIsPaymentDialogOpen}
        title={selectedPackage?.type === 'subscription' ? `Subscribe to ${selectedPackage?.name}` : `Purchase ${selectedPackage?.name}`}
        description={selectedPackage?.type === 'subscription' 
          ? `Monthly subscription with ${selectedPackage?.credits} credits included` 
          : `Get ${selectedPackage?.credits}${selectedPackage?.bonus ? ` + ${selectedPackage.bonus} bonus` : ''} credits`
        }
        amount={selectedPackage?.price || 0}
        credits={selectedPackage?.type === 'credits' ? selectedPackage?.credits + (selectedPackage?.bonus || 0) : undefined}
        onConfirm={handlePaymentConfirm}
        processing={processing}
        type={selectedPackage?.type || 'credits'}
      />
    </div>
  );
};

export default Credits;
