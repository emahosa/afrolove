import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePaymentVerification } from "@/components/payment/PaymentVerificationProvider";
import PaymentLoadingScreen from "@/components/payment/PaymentLoadingScreen";
import PaymentDialog from "@/components/payment/PaymentDialog";

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
}

const SubscribePage: React.FC = () => {
  const { user } = useAuth();
  const { isVerifying } = usePaymentVerification();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const fetchPlans = async () => {
      const { data, error } = await supabase.from("plans").select("*");
      if (error) {
        console.error("Error fetching plans:", error);
        toast.error("Could not load subscription plans.");
      } else {
        setPlans(data || []);
      }
      setLoadingPlans(false);
    };
    fetchPlans();
  }, []);

  if (isVerifying) {
    return (
      <PaymentLoadingScreen
        title="Activating Subscription..."
        description="Please wait while we activate your subscription."
      />
    );
  }

  const handleSubscribe = async (planId: string) => {
    if (!user) {
      toast.error("Please log in to subscribe.");
      return;
    }

    setPaymentProcessing(true);
    try {
      const plan = plans.find((p) => p.id === planId);
      if (!plan) throw new Error("Selected plan not found.");

      const { data, error } = await supabase.functions.invoke(
        "create-subscription",
        {
          body: {
            planId: plan.id,
            planName: plan.name,
            paystackPlanCode: plan.paystack_plan_code,
            amount: Math.round(plan.price * 100), // Paystack expects kobo
            credits: plan.credits_per_month,
            email: user.email,
          },
        }
      );

      if (error) throw new Error(error.message);

      if (data?.url) {
        // 🚨 Always redirect to Paystack
        window.location.href = data.url;
      } else {
        throw new Error("No Paystack checkout URL returned.");
      }
    } catch (err: any) {
      console.error("Error subscribing:", err);
      toast.error("Subscription failed", {
        description:
          err.message ||
          "There was an error processing your subscription. Please try again.",
      });
    } finally {
      setPaymentProcessing(false);
      setDialogOpen(false);
    }
  };

  const selectedPlanDetails = plans.find((p) => p.id === selectedPlanId);

  return (
    <>
      <div className="container mx-auto py-12 px-4 md:px-6 max-w-5xl text-white">
        <Card className="shadow-lg border-white/10 bg-white/5 backdrop-blur-sm">
          <CardHeader className="text-center px-6 py-8 bg-dark-purple/20 rounded-t-lg">
            <CardTitle className="text-4xl font-extrabold tracking-tight text-white">
              Unlock Your Full Potential
            </CardTitle>
            <CardDescription className="text-xl text-gray-300 mt-2">
              Choose a plan that fits your creative needs and access all premium
              features.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 md:p-10 space-y-10">
            {loadingPlans ? (
              <p className="text-gray-400 text-center">Loading plans...</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {plans.map((plan) => (
                  <Card
                    key={plan.id}
                    className="flex flex-col bg-black/20 border-white/10 hover:border-dark-purple transition-colors duration-300"
                  >
                    <CardHeader className="pb-4">
                      <CardTitle className="text-2xl font-semibold text-white">
                        {plan.name}
                      </CardTitle>
                      <CardDescription className="text-lg font-medium text-dark-purple">
                        {plan.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow space-y-4">
                      <ul className="space-y-2 text-sm text-gray-300">
                        {plan.features?.map((feature, index) => (
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
                        disabled={
                          paymentProcessing ||
                          !user ||
                          user?.subscription?.planId === plan.id
                        }
                      >
                        {user?.subscription?.planId === plan.id
                          ? "Current Plan"
                          : user?.subscription?.planId
                          ? "Upgrade / Downgrade"
                          : "Subscribe Now"}
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col items-center text-center p-6 bg-black/20 rounded-b-lg">
            <p className="text-sm text-gray-500 mb-4">
              By subscribing, you agree to our{" "}
              <Link to="/terms" className="underline hover:text-dark-purple">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link to="/privacy" className="underline hover:text-dark-purple">
                Privacy Policy
              </Link>
              .
            </p>
            <Link to="/dashboard">
              <Button variant="ghost" className="text-gray-400 hover:text-white">
                Maybe Later
              </Button>
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
