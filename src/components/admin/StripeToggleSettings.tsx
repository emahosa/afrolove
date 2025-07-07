
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { CreditCard, Shield, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface StripeSettingValue {
  enabled: boolean;
}

export const StripeToggleSettings = () => {
  const [stripeEnabled, setStripeEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    loadStripeSettings();
  }, []);

  const loadStripeSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'stripe_enabled')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading Stripe settings:', error);
        toast.error('Failed to load Stripe settings');
        return;
      }

      if (data?.value) {
        const settingValue = data.value as StripeSettingValue;
        setStripeEnabled(settingValue.enabled === true);
      }
    } catch (error) {
      console.error('Error loading Stripe settings:', error);
      toast.error('Failed to load Stripe settings');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleToggleStripe = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('User not authenticated');
        return;
      }

      const newEnabled = !stripeEnabled;

      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: 'stripe_enabled',
          value: { enabled: newEnabled } as StripeSettingValue,
          category: 'payment',
          description: 'Controls whether Stripe payment processing is enabled',
          updated_by: user.id
        });

      if (error) {
        console.error('Error updating Stripe settings:', error);
        toast.error('Failed to update Stripe settings');
        return;
      }

      setStripeEnabled(newEnabled);
      toast.success(`Stripe payments ${newEnabled ? 'enabled' : 'disabled'} successfully`);
    } catch (error) {
      console.error('Error updating Stripe settings:', error);
      toast.error('Failed to update Stripe settings');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Gateway Settings
          </CardTitle>
          <CardDescription>Loading payment settings...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Gateway Settings
        </CardTitle>
        <CardDescription>
          Control how payments are processed in the application
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="stripe-toggle" className="text-base font-medium">
              Stripe Payment Processing
            </Label>
            <p className="text-sm text-muted-foreground">
              Enable or disable Stripe payment gateway for credit purchases and subscriptions
            </p>
          </div>
          <Switch
            id="stripe-toggle"
            checked={stripeEnabled}
            onCheckedChange={handleToggleStripe}
            disabled={loading}
          />
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {stripeEnabled ? (
              <>
                <strong>Stripe Enabled:</strong> All payments will be processed through Stripe's secure payment gateway. 
                Users will be redirected to Stripe Checkout for credit purchases and subscription payments.
              </>
            ) : (
              <>
                <strong>Stripe Disabled:</strong> Payments will be processed automatically without a payment gateway. 
                Credits and subscriptions will be granted immediately without actual payment processing.
                <span className="text-orange-600 font-medium"> This should only be used for testing purposes.</span>
              </>
            )}
          </AlertDescription>
        </Alert>

        <div className="flex items-center gap-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <Shield className={`h-4 w-4 ${stripeEnabled ? 'text-green-600' : 'text-orange-600'}`} />
            <span className="text-sm font-medium">
              Status: {stripeEnabled ? 'Secure Payment Gateway Active' : 'Automatic Processing Active'}
            </span>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadStripeSettings}
            disabled={loading}
          >
            Refresh Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
