
import React, { useState } from 'react';
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
    priceId: "price_basic_monthly", // Replace with your Stripe Price ID
    paystackPlanCode: "PLN_xxxxxxxxxxxx", // Replace with your Paystack Plan Code
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
    priceId: "price_premium_monthly", // Replace with your Stripe Price ID
    paystackPlanCode: "PLN_yyyyyyyyyyyy", // Replace with your Paystack Plan Code
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
    priceId: "price_professional_monthly", // Replace with your Stripe Price ID
    paystackPlanCode: "PLN_zzzzzzzzzzzz", // Replace with your Paystack Plan Code
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

      // The backend will determine which payment gateway to use.
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

      if (error) {
        // The function itself might throw an error (e.g., payments disabled)
        throw new Error(error.message || 'Failed to create subscription session.');
      }

      // A successful response should always contain a URL to redirect the user to.
      if (data?.url) {
        window.location.href = data.url;
      } else {
        // If there's no URL, something is wrong with the configuration or response.
        console.error("No redirect URL received from server:", data);
        throw new Error('Could not initialize payment. Please contact support.');
      }
      
    } catch (error) {
      console.error("Error during subscription initiation:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast.error("Subscription Failed", {
        description: errorMessage || "There was an error processing your subscription. Please try again.",
      });
      // Close the dialog on failure so the user can try again.
      setDialogOpen(false);
    } finally {
      // Don't set processing to false here, as the user is being redirected.
      // If there's an error, it will be set to false in the catch block.
      // setPaymentProcessing(false);
    }
  };

  const selectedPlanDetails = subscriptionPlansData.find(p => p.id === selectedPlanId);

  return (
    <>
      <div className="container mx-auto py-12 px-4 md:px-6 max-w-5xl text-white">
        <Card className="shadow-lg border-white/10 bg-white/5 backdrop-blur-sm">
          <CardHeader className="text-center px-6 py-8 bg-dark-purple/20 rounded-t-lg">
            <CardTitle className="text-4xl font-extrabold tracking-tight text-white">Unlock Your Full Potential</CardTitle>
            <CardDescription className="text-xl text-gray-300 mt-2">
              Choose a plan that fits your creative needs and access all premium features.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 md:p-10 space-y-10">
            <div className="text-center">
              <p className="text-lg text-gray-400">
                Our subscription plans give you unlimited access to music generation, your full song library, credit purchases, and much more!
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {subscriptionPlansData.map((plan) => (
                <Card key={plan.id} className="flex flex-col bg-black/20 border-white/10 hover:border-dark-purple transition-colors duration-300">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-2xl font-semibold text-white">{plan.name}</CardTitle>
                    <CardDescription className="text-lg font-medium text-dark-purple">{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow space-y-4">
                    <ul className="space-y-2 text-sm text-gray-300">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start">
                          <CheckCircle className="h-5 w-5 mr-2 text-dark-purple flex-shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter className="mt-auto pt-6">
                    <Button
                      className="w-full text-lg py-3 bg-dark-purple hover:bg-opacity-90 font-bold"
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
          <CardFooter className="flex flex-col items-center text-center p-6 bg-black/20 rounded-b-lg">
            <p className="text-sm text-gray-500 mb-4">
              By subscribing, you agree to our <Link to="/terms" className="underline hover:text-dark-purple">Terms of Service</Link> and <Link to="/privacy" className="underline hover:text-dark-purple">Privacy Policy</Link>.
            </p>
            <Link to="/dashboard">
              <Button variant="ghost" className="text-gray-400 hover:text-white">Maybe Later</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>

      {selectedPlanDetails && (
        <PaymentDialog
          open={dialogOpen && selectedPlanId !== null}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedPlanId(null);
              setPaymentProcessing(false); // Reset processing state if dialog is closed
            }
            setDialogOpen(open);
          }}
          title={`Subscribe to ${selectedPlanDetails.name}`}
          description={`You are about to subscribe to the ${selectedPlanDetails.name} plan for ${selectedPlanDetails.description}.`}
          amount={Math.round(selectedPlanDetails.price * 100)}
          onConfirm={() => selectedPlanId && handleSubscribe(selectedPlanId)}
          processing={paymentProcessing}
          type="subscription"
        />
      )}
    </>
  );
};

export default SubscribePage;
