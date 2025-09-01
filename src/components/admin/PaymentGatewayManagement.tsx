
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save } from 'lucide-react';

interface PaymentSettings {
  paystack_public_key: string;
  paystack_secret_key: string;
  stripe_publishable_key: string;
  stripe_secret_key: string;
  paystack_enabled: boolean;
  stripe_enabled: boolean;
}

const PaymentGatewayManagement = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<PaymentSettings>({
    paystack_public_key: '',
    paystack_secret_key: '',
    stripe_publishable_key: '',
    stripe_secret_key: '',
    paystack_enabled: false,
    stripe_enabled: false,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .in('key', [
          'paystack_public_key',
          'paystack_secret_key', 
          'stripe_publishable_key',
          'stripe_secret_key',
          'paystack_enabled',
          'stripe_enabled'
        ]);

      if (error) throw error;

      const newSettings: PaymentSettings = { ...settings };
      data?.forEach(setting => {
        const key = setting.key as keyof PaymentSettings;
        if (typeof setting.value === 'boolean') {
          (newSettings[key] as boolean) = setting.value;
        } else if (typeof setting.value === 'string') {
          (newSettings[key] as string) = setting.value;
        }
      });

      setSettings(newSettings);
    } catch (error: any) {
      console.error('Error loading payment settings:', error);
      toast.error('Failed to load payment settings');
    } finally {
      setIsLoading(false);
    }
  };

  const updateSetting = async (key: keyof PaymentSettings, value: string | boolean) => {
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key,
          value,
          category: 'payment',
          description: `Payment gateway setting: ${key}`,
        });

      if (error) throw error;

      setSettings(prev => ({ ...prev, [key]: value }));
      toast.success('Setting updated successfully');
    } catch (error: any) {
      console.error('Error updating setting:', error);
      toast.error('Failed to update setting');
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Save all settings
      for (const [key, value] of Object.entries(settings)) {
        await updateSetting(key as keyof PaymentSettings, value);
      }
      toast.success('All payment settings saved successfully');
    } catch (error) {
      toast.error('Failed to save some settings');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Payment Gateway Management</h2>
          <p className="text-muted-foreground">Configure payment processors for the platform</p>
        </div>
        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save All Changes
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Paystack Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Paystack Configuration
              <Switch
                checked={settings.paystack_enabled}
                onCheckedChange={(checked) => updateSetting('paystack_enabled', checked)}
              />
            </CardTitle>
            <CardDescription>
              Configure Paystack payment gateway for NGN transactions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="paystack_public_key">Public Key</Label>
              <Input
                id="paystack_public_key"
                type="text"
                value={settings.paystack_public_key}
                onChange={(e) => setSettings(prev => ({ ...prev, paystack_public_key: e.target.value }))}
                placeholder="pk_test_..."
              />
            </div>
            <div>
              <Label htmlFor="paystack_secret_key">Secret Key</Label>
              <Input
                id="paystack_secret_key"
                type="password"
                value={settings.paystack_secret_key}
                onChange={(e) => setSettings(prev => ({ ...prev, paystack_secret_key: e.target.value }))}
                placeholder="sk_test_..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Stripe Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Stripe Configuration
              <Switch
                checked={settings.stripe_enabled}
                onCheckedChange={(checked) => updateSetting('stripe_enabled', checked)}
              />
            </CardTitle>
            <CardDescription>
              Configure Stripe payment gateway for international transactions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="stripe_publishable_key">Publishable Key</Label>
              <Input
                id="stripe_publishable_key"
                type="text"
                value={settings.stripe_publishable_key}
                onChange={(e) => setSettings(prev => ({ ...prev, stripe_publishable_key: e.target.value }))}
                placeholder="pk_test_..."
              />
            </div>
            <div>
              <Label htmlFor="stripe_secret_key">Secret Key</Label>
              <Input
                id="stripe_secret_key"
                type="password"
                value={settings.stripe_secret_key}
                onChange={(e) => setSettings(prev => ({ ...prev, stripe_secret_key: e.target.value }))}
                placeholder="sk_test_..."
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentGatewayManagement;
