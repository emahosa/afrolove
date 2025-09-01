
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface PaymentGatewaySettings {
  stripe_enabled: boolean;
  stripe_publishable_key: string;
  paystack_enabled: boolean;
  paystack_public_key: string;
}

export const PaymentGatewayManagement = () => {
  const [settings, setSettings] = useState<PaymentGatewaySettings>({
    stripe_enabled: false,
    stripe_publishable_key: '',
    paystack_enabled: false,
    paystack_public_key: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', ['stripe_enabled', 'stripe_publishable_key', 'paystack_enabled', 'paystack_public_key']);

      if (error) throw error;

      const settingsMap = data?.reduce((acc, item) => {
        acc[item.key as keyof PaymentGatewaySettings] = item.value as any;
        return acc;
      }, {} as Partial<PaymentGatewaySettings>);

      setSettings(prev => ({ ...prev, ...settingsMap }));
    } catch (error: any) {
      console.error('Error fetching payment settings:', error);
      toast.error('Failed to load payment settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);

      const updates = Object.entries(settings).map(([key, value]) => ({
        key,
        value: value as any,
        category: 'payment_gateways',
        description: `Payment gateway setting for ${key}`
      }));

      const { error } = await supabase
        .from('system_settings')
        .upsert(updates, { onConflict: 'key' });

      if (error) throw error;

      toast.success('Payment gateway settings saved successfully');
    } catch (error: any) {
      console.error('Error saving payment settings:', error);
      toast.error('Failed to save payment settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div>Loading payment gateway settings...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Stripe Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Stripe Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="stripe-enabled">Enable Stripe</Label>
              <Switch
                id="stripe-enabled"
                checked={settings.stripe_enabled}
                onCheckedChange={(checked) =>
                  setSettings(prev => ({ ...prev, stripe_enabled: checked }))
                }
              />
            </div>

            <div>
              <Label htmlFor="stripe-key">Publishable Key</Label>
              <Input
                id="stripe-key"
                type="password"
                value={settings.stripe_publishable_key}
                onChange={(e) =>
                  setSettings(prev => ({ ...prev, stripe_publishable_key: e.target.value }))
                }
                placeholder="pk_test_..."
                disabled={!settings.stripe_enabled}
              />
            </div>
          </CardContent>
        </Card>

        {/* Paystack Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Paystack Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="paystack-enabled">Enable Paystack</Label>
              <Switch
                id="paystack-enabled"
                checked={settings.paystack_enabled}
                onCheckedChange={(checked) =>
                  setSettings(prev => ({ ...prev, paystack_enabled: checked }))
                }
              />
            </div>

            <div>
              <Label htmlFor="paystack-key">Public Key</Label>
              <Input
                id="paystack-key"
                type="password"
                value={settings.paystack_public_key}
                onChange={(e) =>
                  setSettings(prev => ({ ...prev, paystack_public_key: e.target.value }))
                }
                placeholder="pk_test_..."
                disabled={!settings.paystack_enabled}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Button onClick={saveSettings} disabled={saving}>
        {saving ? 'Saving...' : 'Save Settings'}
      </Button>
    </div>
  );
};
