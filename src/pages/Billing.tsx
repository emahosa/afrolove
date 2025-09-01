
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import PaymentDialog from '@/components/payment/PaymentDialog';
import { PaymentVerificationProvider } from '@/components/payment/PaymentVerificationProvider';
import { toast } from 'sonner';
import { Check, Star, Zap } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  credits_per_month: number;
  description: string;
  features: string[];
  stripePriceId: string;
  paystackPlanCode: string;
  interval: string;
  rank: number;
  active: boolean;
}

const Billing = () => {
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [userCredits, setUserCredits] = useState(0);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('active', true)
        .order('rank');

      if (error) throw error;
      
      // Map database fields to Plan interface
      const mappedPlans = data?.map(plan => ({
        id: plan.id,
        name: plan.name,
        price: plan.price,
        currency: plan.currency,
        credits_per_month: plan.credits_per_month,
        description: plan.description,
        features: plan.features || [],
        stripePriceId: plan.stripe_price_id,
        paystackPlanCode: plan.paystack_plan_code,
        interval: plan.interval,
        rank: plan.rank,
        active: plan.active
      })) || [];

      setPlans(mappedPlans);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast.error('Failed to load subscription plans');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserData = async () => {
    if (!user) return;

    try {
      // Fetch user credits
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      setUserCredits(profile.credits || 0);

      // Fetch current subscription
      const { data: subscription, error: subError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (subError && subError.code !== 'PGRST116') throw subError;
      setCurrentSubscription(subscription);
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  useEffect(() => {
    fetchPlans();
    fetchUserData();
  }, [user]);

  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    setPaymentDialogOpen(true);
  };

  const handlePaymentSuccess = () => {
    setPaymentDialogOpen(false);
    setSelectedPlan(null);
    fetchUserData();
    toast.success('Subscription activated successfully!');
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading subscription plans...</div>
      </div>
    );
  }

  return (
    <PaymentVerificationProvider>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
            <p className="text-lg text-muted-foreground">
              Unlock unlimited creativity with our AI music generation plans
            </p>
          </div>

          {user && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Current Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg">Available Credits: <span className="font-bold">{userCredits}</span></p>
                    {currentSubscription && (
                      <p className="text-sm text-muted-foreground">
                        Current Plan: {currentSubscription.plan_name} • Status: {currentSubscription.status}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card key={plan.id} className={`relative ${plan.rank === 2 ? 'border-primary shadow-lg' : ''}`}>
                {plan.rank === 2 && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-4 py-1">
                      <Star className="h-3 w-3 mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <div className="text-3xl font-bold">
                    ${plan.price}
                    <span className="text-lg font-normal text-muted-foreground">/{plan.interval}</span>
                  </div>
                  <p className="text-muted-foreground">{plan.description}</p>
                </CardHeader>
                
                <CardContent>
                  <div className="mb-6">
                    <div className="flex items-center justify-center mb-4">
                      <Zap className="h-5 w-5 text-yellow-500 mr-2" />
                      <span className="text-lg font-semibold">{plan.credits_per_month} credits/month</span>
                    </div>
                    
                    <ul className="space-y-2">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center">
                          <Check className="h-4 w-4 text-green-500 mr-2" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <Button 
                    className="w-full" 
                    variant={plan.rank === 2 ? "default" : "outline"}
                    onClick={() => handleSelectPlan(plan)}
                    disabled={!user}
                  >
                    {currentSubscription?.plan_id === plan.id ? 'Current Plan' : 'Select Plan'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {!user && (
            <div className="text-center mt-8">
              <p className="text-muted-foreground">Please sign in to select a subscription plan.</p>
            </div>
          )}
        </div>

        <PaymentDialog
          isOpen={paymentDialogOpen}
          onClose={() => setPaymentDialogOpen(false)}
          plan={selectedPlan}
          onSuccess={handlePaymentSuccess}
        />
      </div>
    </PaymentVerificationProvider>
  );
};

export default Billing;
