import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const SubscribePage: React.FC = () => {
  const { user, refreshAffiliateApplicationStatus } = useAuth(); // Assuming refreshAffiliateApplicationStatus also refreshes roles or we need a dedicated role refresher
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState<null | 'monthly' | 'annual'>(null);

  const handleSubscribe = async (planType: 'monthly' | 'annual') => {
    if (!user) {
      toast.error('You must be logged in to subscribe.');
      navigate('/login');
      return;
    }

    setIsLoading(planType);

    const now = new Date();
    const expiresAt = new Date(now);
    if (planType === 'monthly') {
      expiresAt.setMonth(now.getMonth() + 1);
    } else {
      expiresAt.setFullYear(now.getFullYear() + 1);
    }

    try {
      // Upsert into user_subscriptions
      // This will either create a new subscription or update an existing one.
      // The assign_subscriber_role trigger should fire on this change.
      const { error: subError } = await supabase
        .from('user_subscriptions')
        .upsert(
          {
            user_id: user.id, // user_id is the primary key or part of a unique constraint
            subscription_type: planType,
            subscription_status: 'active',
            started_at: now.toISOString(),
            expires_at: expiresAt.toISOString(),
            updated_at: now.toISOString(),
          },
          { onConflict: 'user_id' } // Assumes user_id is the conflict target to achieve upsert behavior
        );

      if (subError) {
        throw subError;
      }

      toast.success(`Successfully subscribed to the ${planType} plan!`);

      // It's crucial that AuthContext re-fetches user roles or has its state updated
      // to reflect the new 'subscriber' role.
      // A simple way is to force a page reload or navigate, assuming AuthContext fetches on mount.
      // Or ideally, AuthContext has a method to refresh user data including roles.
      // For now, let's assume AuthContext's useEffect for session changes will pick this up,
      // or a manual refresh mechanism if available in useAuth().
      // Let's call refreshAffiliateApplicationStatus as it might re-fetch roles or related data.
      // A more direct refreshUserRoles() would be better if it existed.
      if (refreshAffiliateApplicationStatus) { // Check if function exists
          await refreshAffiliateApplicationStatus(); // This might re-fetch roles due to its own logic
      }

      // To ensure ProtectedRoute re-evaluates, navigate away and back or force reload.
      // Navigating to dashboard is a common pattern after subscription.
      navigate('/dashboard');
      // window.location.reload(); // More forceful, but might be needed if context doesn't update smoothly

    } catch (error: any) {
      console.error(`Error subscribing to ${planType} plan:`, error);
      toast.error(`Failed to subscribe: ${error.message}`);
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="container mx-auto py-12 px-4 md:px-6 max-w-3xl">
      <Card className="shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold tracking-tight">Unlock Your Full Potential</CardTitle>
          <CardDescription className="text-xl text-muted-foreground">
            Choose a plan that fits your creative needs and access all premium features.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="text-center">
            <p className="text-lg">
              Our subscription plans give you unlimited access to music generation, your full song library, credit purchases, and much more!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Placeholder Plan 1 */}
            <Card>
              <CardHeader>
                <CardTitle>Monthly Plan</CardTitle>
                <CardDescription>$10/month</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 mr-2 text-green-500" /> Unlimited Music Generation</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 mr-2 text-green-500" /> Full Song Library Access</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 mr-2 text-green-500" /> Purchase Additional Credits</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 mr-2 text-green-500" /> Priority Support</li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={() => handleSubscribe('monthly')} disabled={isLoading === 'monthly'}>
                  {isLoading === 'monthly' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Subscribe Now
                </Button>
              </CardFooter>
            </Card>

            {/* Placeholder Plan 2 */}
            <Card>
              <CardHeader>
                <CardTitle>Annual Plan</CardTitle>
                <CardDescription>$100/year (Save $20!)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 mr-2 text-green-500" /> All Monthly Plan Features</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 mr-2 text-green-500" /> Save 16% Annually</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 mr-2 text-green-500" /> Early Access to New Features</li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={() => handleSubscribe('annual')} disabled={isLoading === 'annual'}>
                  {isLoading === 'annual' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Subscribe Now
                </Button>
              </CardFooter>
            </Card>
          </div>

        </CardContent>
        <CardFooter className="flex flex-col items-center text-center">
          <p className="text-sm text-muted-foreground mb-4">
            By subscribing, you agree to our Terms of Service and Privacy Policy.
          </p>
          <Link to="/dashboard">
            <Button variant="outline">Maybe Later</Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
};

export default SubscribePage;
