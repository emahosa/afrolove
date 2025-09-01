
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Zap } from 'lucide-react';
import { PaymentDialog } from '@/components/payment/PaymentDialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: string;
  features: string[];
  stripePriceId?: string;
  paystackPlanCode?: string;
  creditsPerMonth: number;
  active: boolean;
}

const Billing = () => {
  const { user, isSubscriber } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('active', true)
        .order('rank');

      if (error) throw error;
      
      // Map database fields to component interface
      const mappedPlans = data?.map(plan => ({
        id: plan.id,
        name: plan.name,
        description: plan.description || '',
        price: plan.price,
        currency: plan.currency,
        interval: plan.interval,
        features: plan.features || [],
        stripePriceId: plan.stripe_price_id || undefined,
        paystackPlanCode: plan.paystack_plan_code || undefined,
        creditsPerMonth: plan.credits_per_month,
        active: plan.active,
      })) || [];
      
      setPlans(mappedPlans);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast.error('Failed to load subscription plans');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = (plan: Plan) => {
    if (!user) {
      toast.error('Please log in to subscribe');
      return;
    }
    setSelectedPlan(plan);
    setShowPaymentDialog(true);
  };

  const getPlanIcon = (planName: string) => {
    if (planName.toLowerCase().includes('premium') || planName.toLowerCase().includes('pro')) {
      return <Crown className="h-6 w-6 text-yellow-500" />;
    }
    return <Zap className="h-6 w-6 text-blue-500" />;
  };

  const getPlanColor = (planName: string) => {
    if (planName.toLowerCase().includes('premium') || planName.toLowerCase().includes('pro')) {
      return 'from-yellow-500 to-orange-500';
    }
    return 'from-blue-500 to-purple-500';
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">Loading plans...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
        <p className="text-xl text-muted-foreground">
          Unlock the full potential of AI music creation
        </p>
        {isSubscriber() && (
          <Badge className="mt-4" variant="default">
            Current Subscriber
          </Badge>
        )}
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
        {plans.map((plan) => (
          <Card key={plan.id} className={`relative overflow-hidden transition-all duration-300 hover:shadow-xl ${
            plan.name.toLowerCase().includes('premium') || plan.name.toLowerCase().includes('pro')
              ? 'border-yellow-500 shadow-yellow-500/20' 
              : ''
          }`}>
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${getPlanColor(plan.name)}`} />
            
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-2">
                {getPlanIcon(plan.name)}
              </div>
              <CardTitle className="text-2xl">{plan.name}</CardTitle>
              <div className="text-3xl font-bold">
                {plan.currency === 'USD' ? '$' : '₦'}{plan.price}
                <span className="text-lg font-normal text-muted-foreground">
                  /{plan.interval}
                </span>
              </div>
              <p className="text-muted-foreground">{plan.description}</p>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="text-center py-2">
                <Badge variant="secondary">
                  {plan.creditsPerMonth} credits/{plan.interval}
                </Badge>
              </div>

              <ul className="space-y-2">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className="w-full mt-6"
                onClick={() => handleSelectPlan(plan)}
                disabled={!user}
                variant={plan.name.toLowerCase().includes('premium') || plan.name.toLowerCase().includes('pro') ? 'default' : 'outline'}
              >
                {!user ? 'Login to Subscribe' : 'Choose Plan'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {showPaymentDialog && selectedPlan && (
        <PaymentDialog
          isOpen={showPaymentDialog}
          onClose={() => {
            setShowPaymentDialog(false);
            setSelectedPlan(null);
          }}
          amount={selectedPlan.price}
          currency={selectedPlan.currency}
          planName={selectedPlan.name}
          stripePriceId={selectedPlan.stripePriceId}
          paystackPlanCode={selectedPlan.paystackPlanCode}
        />
      )}
    </div>
  );
};

export default Billing;
