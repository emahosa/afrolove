import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from 'sonner';
import { Loader2, CreditCard } from 'lucide-react';

interface PaymentConfig {
  stripe_publishable_key: string;
  stripe_secret_key: string;
  paystack_public_key: string;
  paystack_secret_key: string;
  stripe_enabled: boolean;
  paystack_enabled: boolean;
}

const PaymentGatewayManagement: React.FC = () => {
  const [config, setConfig] = useState<PaymentConfig>({
    stripe_publishable_key: '',
    stripe_secret_key: '',
    paystack_public_key: '',
    paystack_secret_key: '',
    stripe_enabled: false,
    paystack_enabled: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', [
          'stripe_publishable_key',
          'stripe_secret_key', 
          'paystack_public_key',
          'paystack_secret_key',
          'stripe_enabled',
          'paystack_enabled'
        ]);

      if (error) {
        toast.error('Failed to fetch payment configuration');
        console.error('Error fetching config:', error);
        return;
      }

      if (data) {
        const configObj = data.reduce((acc, item) => {
          let value = item.value;
          if (typeof value === 'string') {
            try {
              value = JSON.parse(value);
            } catch {
              // Keep as string if not valid JSON
            }
          }
          acc[item.key as keyof PaymentConfig] = value;
          return acc;
        }, {} as any);

        setConfig({
          stripe_publishable_key: configObj.stripe_publishable_key || '',
          stripe_secret_key: configObj.stripe_secret_key || '',
          paystack_public_key: configObj.paystack_public_key || '',
          paystack_secret_key: configObj.paystack_secret_key || '',
          stripe_enabled: configObj.stripe_enabled === true || configObj.stripe_enabled === 'true',
          paystack_enabled: configObj.paystack_enabled === true || configObj.paystack_enabled === 'true'
        });
      }
    } catch (error) {
      console.error('Error fetching config:', error);
      toast.error('Failed to fetch payment configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const configEntries = Object.entries(config).map(([key, value]) => ({
        key,
        value: JSON.stringify(value),
        category: 'payment',
        description: `Payment gateway configuration for ${key}`
      }));

      // First, delete existing entries
      const { error: deleteError } = await supabase
        .from('system_settings')
        .delete()
        .in('key', Object.keys(config));

      if (deleteError) {
        console.error('Error deleting existing config:', deleteError);
      }

      // Insert new entries
      const { error } = await supabase
        .from('system_settings')
        .insert(configEntries);

      if (error) {
        toast.error('Failed to update payment configuration');
        console.error('Error updating config:', error);
      } else {
        toast.success('Payment configuration updated successfully');
      }
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Failed to update payment configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleConfigChange = (key: keyof PaymentConfig, value: string | boolean) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="mr-2 h-5 w-5" />
            Payment Gateway Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <CreditCard className="mr-2 h-5 w-5" />
          Payment Gateway Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stripe Configuration */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Stripe</h3>
            <Switch
              checked={config.stripe_enabled}
              onCheckedChange={(checked) => handleConfigChange('stripe_enabled', checked)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="stripe-publishable">Publishable Key</Label>
            <Input
              id="stripe-publishable"
              type="text"
              value={config.stripe_publishable_key}
              onChange={(e) => handleConfigChange('stripe_publishable_key', e.target.value)}
              placeholder="pk_test_..."
              disabled={!config.stripe_enabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="stripe-secret">Secret Key</Label>
            <Input
              id="stripe-secret"
              type="password"
              value={config.stripe_secret_key}
              onChange={(e) => handleConfigChange('stripe_secret_key', e.target.value)}
              placeholder="sk_test_..."
              disabled={!config.stripe_enabled}
            />
          </div>
        </div>

        <Separator />

        {/* Paystack Configuration */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Paystack</h3>
            <Switch
              checked={config.paystack_enabled}
              onCheckedChange={(checked) => handleConfigChange('paystack_enabled', checked)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="paystack-public">Public Key</Label>
            <Input
              id="paystack-public"
              type="text"
              value={config.paystack_public_key}
              onChange={(e) => handleConfigChange('paystack_public_key', e.target.value)}
              placeholder="pk_test_..."
              disabled={!config.paystack_enabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="paystack-secret">Secret Key</Label>
            <Input
              id="paystack-secret"
              type="password"
              value={config.paystack_secret_key}
              onChange={(e) => handleConfigChange('paystack_secret_key', e.target.value)}
              placeholder="sk_test_..."
              disabled={!config.paystack_enabled}
            />
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Configuration'
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default PaymentGatewayManagement;
