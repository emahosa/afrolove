
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Crown, Star } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAffiliateTracking } from '@/hooks/useAffiliateTracking';

const Subscription = () => {
  const { user } = useAuth();
  const { trackSubscriptionPageVisit } = useAffiliateTracking();
  const [loading, setLoading] = useState(false);
  const [isStripeEnabled, setIsStripeEnabled] = useState(false);

  useEffect(() => {
    // Track subscription page visit when component mounts (triggers free referral bonus)
    trackSubscriptionPageVisit();
    
    // Check if Stripe is enabled
    checkStripeSettings();
  }, []);

  const checkStripeSettings = async () => {
    try {
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'stripe_enabled')
        .single();
      
      setIsStripeEnabled(data?.value === true);
    } catch (error) {
      console.error('Error checking Stripe settings:', error);
    }
  };

  const handleSubscribe = async (planType: 'monthly' | 'yearly') => {
    if (!user) {
      toast.error('Please log in to subscribe');
      return;
    }

    setLoading(true);

    try {
      if (isStripeEnabled) {
        // Handle Stripe payment
        const { data, error } = await supabase.functions.invoke('create-subscription', {
          body: { 
            plan_type: planType,
            user_id: user.id 
          }
        });

        if (error) {
          throw error;
        }

        if (data?.url) {
          // Open Stripe checkout in a new tab
          window.open(data.url, '_blank');
        }
      } else {
        // Handle automatic subscription (no payment required)
        const { error } = await supabase.functions.invoke('activate-subscription', {
          body: { 
            user_id: user.id,
            plan_type: planType
          }
        });

        if (error) {
          throw error;
        }

        toast.success('Subscription activated successfully!');
        
        // Reload the page to reflect the new subscription status
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (error: any) {
      console.error('Subscription error:', error);
      toast.error(error.message || 'Failed to process subscription');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    'Unlimited song generation',
    'Premium voice models',
    'High-quality audio downloads',
    'Custom lyrics support',
    'Priority processing',
    'Advanced customization options',
    'Commercial usage rights',
    'Premium support'
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Choose Your Plan
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Unlock unlimited creativity with our premium subscription plans
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Monthly Plan */}
        <Card className="relative border-2 hover:border-purple-300 transition-colors">
          <CardHeader className="text-center pb-8">
            <div className="mx-auto w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
              <Star className="w-6 h-6 text-purple-600" />
            </div>
            <CardTitle className="text-2xl">Monthly Plan</CardTitle>
            <div className="text-4xl font-bold text-purple-600 mt-4">
              ${isStripeEnabled ? '19.99' : 'Free'}
              <span className="text-base font-normal text-muted-foreground">/month</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <ul className="space-y-3">
              {features.map((feature, index) => (
                <li key={index} className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
            <Button 
              className="w-full bg-purple-600 hover:bg-purple-700"
              onClick={() => handleSubscribe('monthly')}
              disabled={loading}
            >
              {loading ? 'Processing...' : isStripeEnabled ? 'Subscribe Monthly' : 'Activate Free Plan'}
            </Button>
          </CardContent>
        </Card>

        {/* Yearly Plan */}
        <Card className="relative border-2 border-purple-400 shadow-lg scale-105">
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-full text-sm font-semibold">
              Most Popular
            </div>
          </div>
          <CardHeader className="text-center pb-8">
            <div className="mx-auto w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mb-4">
              <Crown className="w-6 h-6 text-white" />
            </div>
            <CardTitle className="text-2xl">Yearly Plan</CardTitle>
            <div className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mt-4">
              ${isStripeEnabled ? '199.99' : 'Free'}
              <span className="text-base font-normal text-muted-foreground">/year</span>
            </div>
            {isStripeEnabled && (
              <div className="text-sm text-green-600 font-semibold">
                Save $39.89 per year!
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            <ul className="space-y-3">
              {features.map((feature, index) => (
                <li key={index} className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
            <Button 
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              onClick={() => handleSubscribe('yearly')}
              disabled={loading}
            >
              {loading ? 'Processing...' : isStripeEnabled ? 'Subscribe Yearly' : 'Activate Free Plan'}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="text-center mt-12">
        <p className="text-sm text-muted-foreground">
          {isStripeEnabled 
            ? 'All plans include a 7-day free trial. Cancel anytime.' 
            : 'Currently offering free access to all premium features!'
          }
        </p>
      </div>
    </div>
  );
};

export default Subscription;
