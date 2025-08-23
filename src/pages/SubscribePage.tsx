import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { usePaymentVerification } from '@/components/payment/PaymentVerificationProvider';
import PaymentLoadingScreen from '@/components/payment/PaymentLoadingScreen';
import PaymentDialog from '@/components/payment/PaymentDialog';

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

const SubscribePage: React.FC = () => {
  const { user } = useAuth();
  const { isVerifying } = usePaymentVerification();
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const trackVisit = async () => {
      if (user) {
        try {
          await supabase.functions.invoke('track-subscription-page-visit');
        } catch (error) {
          // It's okay if this fails, we don't need to bother the user.
          console.error('Error tracking subscription page visit:', error);
        }
      }
    };

    trackVisit();
  }, [user]);

  if (isVerifying) {
    return <PaymentLoadingScreen title="Activating Subscription..." description="Please wait while we activate your subscription." />;
  }

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
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to create subscription session.');
      }

      // Check if response contains success (automatic processing) or url (Stripe redirect)
      if (data?.success) {
        toast.success("Subscription Activated!", { 
          description: `Your ${plan.name} subscription has been activated successfully.` 
        });
        // Redirect to dashboard or refresh page
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

  return (
    <>
      <div className="container mx-auto py-12 px-4 md:px-6 max-w-4xl">
        <Card className="shadow-lg border-none">
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
                      disabled={paymentProcessing || !user || user?.subscription?.planId === plan.id}
                    >
                      {user?.subscription?.planId === plan.id
                        ? 'Current Plan'
                        : user?.subscription?.planId
                        ? 'Upgrade / Downgrade'
                        : 'Subscribe Now'}
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
      </div>

      {selectedPlanDetails && (
        <PaymentDialog
          open={dialogOpen && selectedPlanId !== null}
          onOpenChange={(open) => {
            if (!open) setSelectedPlanId(null);
            setDialogOpen(open);
          }}
          title={`Subscribe to ${selectedPlanDetails.name}`}
          description={`You are about to subscribe to the ${selectedPlanDetails.name} plan for ${selectedPlanDetails.description}.`}
          amount={selectedPlanDetails.price}
          onConfirm={() => selectedPlanId && handleSubscribe(selectedPlanId)}
          processing={paymentProcessing}
          type="subscription"
        />
      )}
    </>
  );
};

export default SubscribePage;
