
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  features: string[];
  current?: boolean;
}

const plans: SubscriptionPlan[] = [
  {
    id: 'basic',
    name: 'Basic',
    price: 9.99,
    features: ['5 songs per month', 'Basic genres', 'Standard quality']
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 19.99,
    features: ['15 songs per month', 'All genres', 'HD quality', 'Priority support']
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 39.99,
    features: ['Unlimited songs', 'All genres', 'HD quality', '24/7 support', 'Commercial license']
  }
];

const SubscriptionUpgrade: React.FC = () => {
  const { user } = useAuth();
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchCurrentSubscription();
    }
  }, [user]);

  const fetchCurrentSubscription = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('subscription_status', 'active')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        setCurrentSubscription(data[0]);
      }
    } catch (error: any) {
      console.error('Error fetching subscription:', error);
      toast.error('Failed to load subscription details');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscriptionChange = async (planId: string) => {
    if (!user || processing) return;

    setProcessing(planId);

    try {
      const plan = plans.find(p => p.id === planId);
      if (!plan) throw new Error('Plan not found');

      // Create or update subscription
      const { error } = await supabase.functions.invoke('create-subscription', {
        body: {
          priceId: `price_${planId}`,
          planId: planId,
          planName: plan.name,
          amount: Math.round(plan.price * 100) // Convert to cents
        }
      });

      if (error) throw error;

      toast.success(`Successfully ${isUpgrade(planId) ? 'upgraded' : 'changed'} to ${plan.name} plan!`);
      await fetchCurrentSubscription();

    } catch (error: any) {
      console.error('Error changing subscription:', error);
      toast.error(error.message || 'Failed to change subscription');
    } finally {
      setProcessing(null);
    }
  };

  const isUpgrade = (planId: string) => {
    const currentPlanIndex = plans.findIndex(p => p.id === currentSubscription?.subscription_type);
    const newPlanIndex = plans.findIndex(p => p.id === planId);
    return newPlanIndex > currentPlanIndex;
  };

  const isDowngrade = (planId: string) => {
    const currentPlanIndex = plans.findIndex(p => p.id === currentSubscription?.subscription_type);
    const newPlanIndex = plans.findIndex(p => p.id === planId);
    return newPlanIndex < currentPlanIndex;
  };

  const canChangeTo = (planId: string) => {
    if (!currentSubscription) return true;
    return planId !== currentSubscription.subscription_type;
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Manage Subscription</h1>
        <p className="text-gray-600">Upgrade or change your subscription plan</p>
        {currentSubscription && (
          <Badge variant="outline" className="mt-2">
            Current Plan: {plans.find(p => p.id === currentSubscription.subscription_type)?.name || 'Unknown'}
          </Badge>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {plans.map((plan) => {
          const isCurrent = currentSubscription?.subscription_type === plan.id;
          const isProcessingThis = processing === plan.id;
          
          return (
            <Card key={plan.id} className={`relative ${isCurrent ? 'ring-2 ring-primary' : ''}`}>
              {isCurrent && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge variant="default" className="bg-primary">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Current Plan
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <div className="text-3xl font-bold">
                  ${plan.price}
                  <span className="text-sm font-normal text-gray-600">/month</span>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      {feature}
                    </li>
                  ))}
                </ul>
                
                <Button
                  onClick={() => handleSubscriptionChange(plan.id)}
                  disabled={!canChangeTo(plan.id) || isProcessingThis}
                  className="w-full"
                  variant={isCurrent ? "outline" : "default"}
                >
                  {isProcessingThis ? (
                    'Processing...'
                  ) : isCurrent ? (
                    'Current Plan'
                  ) : isUpgrade(plan.id) ? (
                    <>
                      <ArrowUp className="w-4 h-4 mr-2" />
                      Upgrade to {plan.name}
                    </>
                  ) : isDowngrade(plan.id) ? (
                    <>
                      <ArrowDown className="w-4 h-4 mr-2" />
                      Change to {plan.name}
                    </>
                  ) : (
                    `Get ${plan.name}`
                  )}
                </Button>
                
                {isDowngrade(plan.id) && (
                  <p className="text-xs text-gray-500 text-center">
                    Downgrade will take effect at the end of your current billing cycle
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {currentSubscription && (
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            Next billing date: {new Date(currentSubscription.expires_at).toLocaleDateString()}
          </p>
        </div>
      )}
    </div>
  );
};

export default SubscriptionUpgrade;
