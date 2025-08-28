import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { CreditCard, Key, Save, Loader2 } from 'lucide-react';

interface PaymentGatewaySettings {
  enabled: boolean;
  activeGateway: 'stripe' | 'paystack';
  stripe: {
    publicKey: string;
    secretKey: string;
  };
  paystack: {
    publicKey: string;
    secretKey: string;
  };
}

const defaultSettings: PaymentGatewaySettings = {
  enabled: true,
  activeGateway: 'stripe',
  stripe: {
    publicKey: '',
    secretKey: '',
  },
  paystack: {
    publicKey: '',
    secretKey: '',
  },
};

export const PaymentGatewayManagement = () => {
  const [settings, setSettings] = useState<PaymentGatewaySettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'payment_gateway_settings')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data?.value) {
        setSettings({ ...defaultSettings, ...(data.value as Partial<PaymentGatewaySettings>) });
      }
    } catch (error) {
      console.error('Error loading payment gateway settings:', error);
      toast.error('Failed to load payment gateway settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            toast.error('User not authenticated');
            return;
        }

      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: 'payment_gateway_settings',
          value: settings,
          category: 'payment',
          description: 'Configuration for payment gateways (Stripe, Paystack)',
          updated_by: user.id
        }, { onConflict: 'category,key' });

      if (error) {
        throw error;
      }

      toast.success('Payment gateway settings saved successfully');
    } catch (error) {
      console.error('Error saving payment gateway settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment Gateway Settings</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Gateway Management
        </CardTitle>
        <CardDescription>
          Configure and manage payment gateways for your application.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <Label htmlFor="payment-enabled" className="text-base font-medium">
              Enable Payment Gateways
            </Label>
            <p className="text-sm text-muted-foreground">
              Master switch to enable or disable all payment processing.
            </p>
          </div>
          <Switch
            id="payment-enabled"
            checked={settings.enabled}
            onCheckedChange={(checked) => setSettings(s => ({ ...s, enabled: checked }))}
          />
        </div>

        {settings.enabled && (
          <>
            <div className="space-y-4 p-4 border rounded-lg">
              <Label className="text-base font-medium">Active Gateway</Label>
              <RadioGroup
                value={settings.activeGateway}
                onValueChange={(value: 'stripe' | 'paystack') => setSettings(s => ({ ...s, activeGateway: value }))}
                className="flex space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="stripe" id="stripe" />
                  <Label htmlFor="stripe">Stripe</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="paystack" id="paystack" />
                  <Label htmlFor="paystack">Paystack</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Stripe Settings */}
            <div className={`p-4 border rounded-lg ${settings.activeGateway === 'stripe' ? 'border-primary' : ''}`}>
              <h3 className="text-lg font-medium mb-4">Stripe Configuration</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="stripe-pk">Public Key</Label>
                  <Input
                    id="stripe-pk"
                    type="text"
                    placeholder="pk_live_..."
                    value={settings.stripe.publicKey}
                    onChange={(e) => setSettings(s => ({ ...s, stripe: { ...s.stripe, publicKey: e.target.value } }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stripe-sk">Secret Key</Label>
                  <Input
                    id="stripe-sk"
                    type="password"
                    placeholder="sk_live_..."
                    value={settings.stripe.secretKey}
                    onChange={(e) => setSettings(s => ({ ...s, stripe: { ...s.stripe, secretKey: e.target.value } }))}
                  />
                </div>
              </div>
            </div>

            {/* Paystack Settings */}
            <div className={`p-4 border rounded-lg ${settings.activeGateway === 'paystack' ? 'border-primary' : ''}`}>
              <h3 className="text-lg font-medium mb-4">Paystack Configuration</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="paystack-pk">Public Key</Label>
                  <Input
                    id="paystack-pk"
                    type="text"
                    placeholder="pk_live_..."
                    value={settings.paystack.publicKey}
                    onChange={(e) => setSettings(s => ({ ...s, paystack: { ...s.paystack, publicKey: e.target.value } }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paystack-sk">Secret Key</Label>
                  <Input
                    id="paystack-sk"
                    type="password"
                    placeholder="sk_live_..."
                    value={settings.paystack.secretKey}
                    onChange={(e) => setSettings(s => ({ ...s, paystack: { ...s.paystack, secretKey: e.target.value } }))}
                  />
                </div>
              </div>
            </div>
          </>
        )}

        <div className="flex justify-end">
          <Button onClick={handleSaveSettings} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
